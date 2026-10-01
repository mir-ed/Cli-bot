#!/usr/bin/env sh
set -eu

APP_NAME="cli-bot"
PREFIX="${PREFIX:-$HOME/.local}"
BIN_DIR="$PREFIX/bin"
LIB_DIR="$PREFIX/lib/$APP_NAME"
REPO_DIR="$(cd "$(dirname "$0")" && pwd)"
INSTALLED="$BIN_DIR/$APP_NAME"

# ---------- 1. sanity ----------
if [ ! -f "$REPO_DIR/package.json" ]; then
  echo "error: package.json not found next to install.sh" >&2
  exit 1
fi

# ---------- 2. build ----------
echo "==> Building..."
cd "$REPO_DIR"
npm run build

if [ ! -f "$REPO_DIR/dist/index.js" ]; then
  echo "error: dist/index.js not found after build" >&2
  exit 1
fi

# ---------- 3. install files ----------
echo "==> Installing to $PREFIX..."
mkdir -p "$BIN_DIR"

# clean old install so nothing stale survives
rm -rf "$LIB_DIR"
mkdir -p "$LIB_DIR"

# 1. the bundled app
cp "$REPO_DIR/dist/index.js" "$LIB_DIR/index.js"

# 2. loose database files TypeORM needs to glob/require at runtime
mkdir -p "$LIB_DIR/database/entities"   "$LIB_DIR/database/migrations"   "$LIB_DIR/database/enums"

cp "$REPO_DIR/dist/database/entities/"*.js    "$LIB_DIR/database/entities/"   2>/dev/null || true
cp "$REPO_DIR/dist/database/migrations/"*.js  "$LIB_DIR/database/migrations/" 2>/dev/null || true
cp "$REPO_DIR/dist/database/enums/"*.js       "$LIB_DIR/database/enums/"      2>/dev/null || true

# 2b. the logo png (not compiled — copied as-is)
# cp "$REPO_DIR/src/utils/cli-bot-logo.png"     "$LIB_DIR/database/cli-bot-logo.png"


# 3. runtime deps — loose entity/enum files need typeorm etc. on disk
echo "==> Copying node_modules (this may take a bit)..."
cp -R "$REPO_DIR/node_modules" "$LIB_DIR/node_modules"

# the launcher on PATH
cat > "$INSTALLED" <<EOF
#!/usr/bin/env sh
exec node "$LIB_DIR/index.js" "\$@"
EOF
chmod +x "$INSTALLED"

# ---------- 4. PATH check ----------
case ":$PATH:" in
  *":$BIN_DIR:"*) PATH_OK=1 ;;
  *)              PATH_OK=0 ;;
esac

# ---------- 5. report ----------
echo ""
echo "==> Installed:"
echo "    executable : $INSTALLED"
echo "    app files  : $LIB_DIR/"
echo ""

if [ "$PATH_OK" -eq 1 ]; then
  echo "You're good. Try: cli-bot"
else
  echo "NOTE: $BIN_DIR is not on PATH."
  echo "    export PATH=\"\$HOME/.local/bin:\$PATH\""
fi