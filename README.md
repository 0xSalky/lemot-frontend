# lemot-frontend

Next.js UI: **Pairs** (open trades) and **Alerts**.

## Getting started

```bash
yarn install
yarn dev
```

Open **http://localhost:3000**

API routes: `http://localhost:3000/api/...`

## Port 3000 conflict with Cursor

Cursor can bind **localhost:3000** when a Simple Browser tab or port forward is active. Next.js also uses 3000, so the browser may hit Cursor instead of your app → `ERR_CONNECTION_RESET`.

### Avoid it

- Do not open Cursor **Simple Browser** on `http://localhost:3000`
- Terminal panel → **Ports** → do not forward port 3000 (or click **Stop** if it is forwarded)
- Start `yarn dev` **before** opening any in-IDE browser preview

### Check who owns port 3000

```bash
lsof -nP -iTCP:3000 -sTCP:LISTEN
```

Example:

```
COMMAND   PID   USER   ...  NAME
Cursor  34193  you    ...  TCP 127.0.0.1:3000 (LISTEN)
node    94125  you    ...  TCP *:3000 (LISTEN)
```

### Free port 3000 — stale Next.js only

```bash
lsof -nP -iTCP:3000 -sTCP:LISTEN | awk '/node/ {print $2}' | xargs kill -9
```

Then:

```bash
yarn dev
```

### Free port 3000 — Cursor is listening

Cursor’s port forward uses the **main Cursor process**. Killing it **closes the entire IDE** (reopen Cursor after).

**1. Find Cursor’s PID on 3000**

```bash
lsof -nP -iTCP:3000 -sTCP:LISTEN | awk '/Cursor/ {print $2}'
```

**2. Kill Cursor (frees 3000; IDE will quit)**

```bash
kill -9 $(lsof -nP -iTCP:3000 -sTCP:LISTEN | awk '/Cursor/ {print $2}' | head -1)
```

Or one-liner:

```bash
lsof -nP -iTCP:3000 -sTCP:LISTEN | awk '/Cursor/ {print $2}' | xargs kill -9
```

**3. Reopen Cursor, then start the frontend**

```bash
cd lemot-frontend
yarn dev
```

Open http://localhost:3000

### Softer fix (no kill) — try this first

1. Close all **Simple Browser** tabs in Cursor
2. **Ports** panel → stop forwarding **3000**
3. Run `lsof -nP -iTCP:3000 -sTCP:LISTEN` again — Cursor should be gone
4. `yarn dev`

### Kill everything on 3000 (node + Cursor)

Only if you are fine closing Cursor and any dev server:

```bash
lsof -ti :3000 | xargs kill -9
yarn dev
```
