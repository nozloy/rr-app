"""Targeted WoW addon tests using the Lua 5.1 runtime bundled with lupa.

Run: python scripts/test_raidreminder_addon.py
Dependency: lupa (can be installed into a temporary directory on PYTHONPATH).
"""

from pathlib import Path

try:
    from lupa.lua51 import LuaRuntime
except ImportError as error:
    raise SystemExit("Install lupa or add its temporary installation to PYTHONPATH.") from error


root = Path(__file__).resolve().parents[1]
addon = root / "addons" / "RaidReminder"
toc = (addon / "RaidReminder.toc").read_text(encoding="utf-8-sig")
entries = [line.strip().replace("\\", "/") for line in toc.splitlines()
           if line.strip() and not line.startswith("#")]
assert len(entries) == len(set(entries)), "Duplicate TOC entry"
assert "## SavedVariables: RaidReminderDB" in toc, "Missing SavedVariables declaration"
assert "## Interface: 120005" in toc, "Unexpected Interface version change"
assert set(entries) == {path.relative_to(addon).as_posix() for path in addon.rglob("*.lua")}, \
    "A Lua module is missing from the TOC"

runtime = LuaRuntime(unpack_returned_tuples=True)
compile_chunk = runtime.eval("function(s, name) local f,e=loadstring(s,name); return f~=nil,e end")
sources = {}
for entry in entries:
    source = (addon / entry).read_text(encoding="utf-8-sig")
    valid, message = compile_chunk(source, "@" + entry)
    assert valid, message
    sources[entry] = source
print(f"Lua 5.1 syntax, TOC paths/order input and SavedVariables: {len(entries)} modules passed", flush=True)

runtime.globals().ADDON_SOURCES = runtime.table_from(sources)
runtime.globals().ADDON_FILES = runtime.table_from(entries)
runtime.execute((root / "tests" / "addon" / "zombak_spec.lua").read_text(encoding="utf-8"))
