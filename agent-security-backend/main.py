import json
import platform
import sqlite3
import subprocess
from contextlib import contextmanager
from pathlib import Path

from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

DB_PATH = Path(__file__).parent / "secclaw.db"

# 环境安全日志文件路径：Linux 生产环境 vs Windows 测试环境
if platform.system() == "Windows":
    RANSOM_LOG_PATH = Path(r"C:\test\ransom_detection.log")
else:
    RANSOM_LOG_PATH = Path("/opt/KSec/log/ransom_detection.log")

# ---------------------------------------------------------------------------
# Database helpers
# ---------------------------------------------------------------------------

def get_conn() -> sqlite3.Connection:
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    return conn


@contextmanager
def get_db():
    conn = get_conn()
    try:
        yield conn
        conn.commit()
    finally:
        conn.close()


def init_db():
    with get_db() as conn:
        conn.execute("""
            CREATE TABLE IF NOT EXISTS security_modules (
                key               TEXT PRIMARY KEY,
                enabled           INTEGER NOT NULL DEFAULT 1,
                policy_label      TEXT NOT NULL DEFAULT '',
                selected_policies TEXT NOT NULL DEFAULT '[]'
            )
        """)
        conn.execute("""
            CREATE TABLE IF NOT EXISTS sys_log (
                id            INTEGER PRIMARY KEY AUTOINCREMENT,
                type          TEXT NOT NULL,
                level         TEXT NOT NULL,
                title         TEXT NOT NULL,
                description   TEXT NOT NULL,
                time          TEXT NOT NULL,
                result        TEXT NOT NULL
            )
        """)

        # Seed modules if empty
        count = conn.execute("SELECT COUNT(*) FROM security_modules").fetchone()[0]
        if count == 0:
            modules = [
                ("skillAcquisition", 1, "KSecure扫描引擎",
                 json.dumps(["KSecure扫描引擎"])),
                ("runtimeProtection", 1, "企业级安全扫描",
                 json.dumps(["企业级安全扫描", "开源安全扫描"])),
                ("compliance", 1, "敏感信息防护 + 数据隐私保护",
                 json.dumps(["敏感信息防护策略", "数据隐私保护策略", "输出响应规则"])),
                ("environment", 1, "勒索病毒防护 + 入侵检测 + 风险发现 + 文件/进程保护",
                 json.dumps(["勒索病毒防护", "入侵检测", "风险发现", "文件/进程保护"])),
            ]
            conn.executemany(
                "INSERT INTO security_modules (key, enabled, policy_label, selected_policies) VALUES (?, ?, ?, ?)",
                modules,
            )

        # Seed logs if empty
        count = conn.execute("SELECT COUNT(*) FROM sys_log").fetchone()[0]
        if count == 0:
            logs = [
                ("虾苗获取安全", "高危", "检测到可疑远程执行逻辑",
                 "新安装 Skill 中发现高风险执行路径，系统已阻止安装。", "2026-04-06 14:58:00", "已拦截"),
                ("虾苗获取安全", "信息", "依赖包安全检查通过",
                 "安装包依赖已完成扫描，未发现明显风险。", "2026-04-06 14:42:00", "已放行"),
                ("养虾过程安全", "高危", "检测到投毒语料",
                 "上传资料命中高风险投毒特征，系统已阻止导入知识库。", "2026-04-06 14:51:00", "已拦截"),
                ("养虾过程安全", "信息", "上传内容通过安全检查",
                 "最新一批训练材料已完成扫描，未发现明显风险。", "2026-04-06 14:29:00", "已放行"),
                ("安全合规", "高危", "输出命中身份证号",
                 "生成内容包含身份证号，已按规则执行脱敏处理。", "2026-04-06 14:55:00", "已拦截"),
                ("安全合规", "信息", "合规检查通过",
                 "本次输出内容未命中任何敏感规则，正常放行。", "2026-04-06 14:34:00", "已放行"),
            ]
            conn.executemany(
                "INSERT INTO sys_log (type, level, title, description, time, result) VALUES (?, ?, ?, ?, ?, ?)",
                logs,
            )


# ---------------------------------------------------------------------------
# FastAPI app
# ---------------------------------------------------------------------------

app = FastAPI(title="Agent Security Backend")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def startup():
    init_db()


# ---------------------------------------------------------------------------
# Pydantic models
# ---------------------------------------------------------------------------

class ModuleUpdate(BaseModel):
    enabled: bool | None = None
    policy_label: str | None = None
    selected_policies: list[str] | None = None


# ---------------------------------------------------------------------------
# Module endpoints
# ---------------------------------------------------------------------------

@app.get("/api/agent-security/modules")
def list_modules():
    with get_db() as conn:
        rows = conn.execute("SELECT key, enabled, policy_label, selected_policies FROM security_modules").fetchall()
    return [
        {
            "key": r["key"],
            "enabled": bool(r["enabled"]),
            "policyLabel": r["policy_label"],
            "selectedPolicies": json.loads(r["selected_policies"]),
        }
        for r in rows
    ]


@app.patch("/api/agent-security/modules/{module_key}")
def update_module(module_key: str, body: ModuleUpdate):
    with get_db() as conn:
        row = conn.execute("SELECT key FROM security_modules WHERE key = ?", (module_key,)).fetchone()
        if not row:
            return {"error": "module not found"}, 404
        if body.enabled is not None:
            conn.execute("UPDATE security_modules SET enabled = ? WHERE key = ?", (int(body.enabled), module_key))
            if module_key == "environment":
                cmd = "KSec policy add ransom.yaml" if body.enabled else "KSec policy delete ransom.yaml"
                try:
                    subprocess.Popen(cmd, shell=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
                except Exception:
                    pass
        if body.policy_label is not None:
            conn.execute("UPDATE security_modules SET policy_label = ? WHERE key = ?", (body.policy_label, module_key))
        if body.selected_policies is not None:
            conn.execute("UPDATE security_modules SET selected_policies = ? WHERE key = ?", (json.dumps(body.selected_policies), module_key))
    return {"ok": True}


# ---------------------------------------------------------------------------
# Log helpers
# ---------------------------------------------------------------------------

def read_ransom_logs() -> list[dict]:
    """从 ransom_detection.log 解析环境安全日志。"""
    if not RANSOM_LOG_PATH.exists():
        return []
    results: list[dict] = []
    for idx, line in enumerate(RANSOM_LOG_PATH.read_text(encoding="utf-8").strip().splitlines(), start=1):
        try:
            entry = json.loads(line)
        except json.JSONDecodeError:
            continue
        results.append({
            "id": idx,
            "type": "环境安全",
            "level": "高危",
            "title": f"勒索行为已阻断（{entry.get('action', '')}）",
            "description": f"检测到可疑加密行为，用户 {entry.get('user', '?')}，已自动终止相关进程。",
            "time": entry.get("time", ""),
            "result": "已拦截",
        })
    results.sort(key=lambda x: x["time"], reverse=True)
    return results


# ---------------------------------------------------------------------------
# Log endpoints
# ---------------------------------------------------------------------------

@app.get("/api/agent-security/logs")
def list_logs(type: str | None = Query(default=None)):
    # 环境安全日志来自文件
    if type == "环境安全":
        return read_ransom_logs()

    # 其他模块从数据库读取
    with get_db() as conn:
        if type:
            rows = conn.execute(
                "SELECT * FROM sys_log WHERE type = ? ORDER BY id DESC", (type,)
            ).fetchall()
        else:
            rows = conn.execute("SELECT * FROM sys_log ORDER BY id DESC").fetchall()

    db_logs = [
        {
            "id": r["id"],
            "type": r["type"],
            "level": r["level"],
            "title": r["title"],
            "description": r["description"],
            "time": r["time"],
            "result": r["result"],
        }
        for r in rows
        if r["type"] != "环境安全"  # 全量查询时排除数据库中的环境安全 seed 数据
    ]

    # 全量查询时合并文件日志
    if type is None:
        db_logs.extend(read_ransom_logs())
        db_logs.sort(key=lambda x: x["time"], reverse=True)

    return db_logs


# ---------------------------------------------------------------------------
# Run
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=9003, reload=True)
