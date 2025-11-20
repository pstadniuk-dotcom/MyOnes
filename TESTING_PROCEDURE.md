# ONES AI - Testing & Verification Procedure

To prevent deployment issues and ensure stability, follow this procedure before marking any feature as "Complete".

## 1. Pre-Implementation Check
- [ ] **Identify Impact:** Which files will be touched? (Frontend, Backend, Database)
- [ ] **Check Dependencies:** Do we need new packages? (Add to `package.json`)

## 2. Implementation Phase
- [ ] **Development Mode:** Run `npm run dev` to test changes in real-time.
- [ ] **Database Changes:** If schema changed, run `npm run db:push`.

## 3. Verification Phase (The "Smoke Test")
Before committing or deploying, perform these checks:

### A. Build Verification
Ensure the project builds without errors.
```bash
npm run build
```

### B. Production Simulation
Run the server in production mode locally to catch "works on my machine" bugs.
```bash
# Windows PowerShell
$env:NODE_ENV="production"; node dist/index.js
```

### C. Automated Verification
Run the verification script to check system health.
```bash
npm run verify
```
*Note: If this fails with "fetch failed" in the terminal but the browser works, it may be a local firewall/network restriction. Trust the browser check in that case.*

## 4. Feature-Specific Checks
- **New API Endpoint:** Test with `curl` or Postman.
- **New UI Component:** Verify in browser (check Console for errors).
- **Database:** Verify data persistence (refresh page, check DB).

## 5. Troubleshooting
If `npm run verify` fails:
1.  **Check Logs:** Look at the terminal output or `server.log`.
2.  **Port Conflicts:** Ensure port 5000 is free (`netstat -ano | findstr 5000`).
3.  **Rebuild:** Run `npm run build` again.
