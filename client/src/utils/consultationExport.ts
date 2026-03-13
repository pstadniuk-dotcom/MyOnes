/**
 * Generates a beautifully formatted HTML consultation export
 * that users can view in their browser and print to PDF
 */

interface ExportMessage {
  sender: 'user' | 'ai' | 'system';
  content: string;
  timestamp: string;
  formula?: {
    bases: { name: string; dose: string; purpose: string }[];
    additions: { name: string; dose: string; purpose: string }[];
    totalMg: number;
    warnings?: string[];
    rationale?: string;
    disclaimers?: string[];
  };
}

interface ConsultationExportData {
  sessionId: string;
  exportDate: string;
  messages: ExportMessage[];
  userName?: string;
}

/** Convert markdown-like formatting to HTML */
function markdownToHtml(text: string): string {
  if (!text) return '';

  // Remove JSON code blocks (formula data embedded in messages)
  let html = text.replace(/```json\s*[\s\S]*?```/g, '');
  html = html.replace(/```json\s*[\s\S]*$/g, '');
  html = html.replace(/```health-data\s*[\s\S]*?```/g, '');
  html = html.replace(/```health-data\s*[\s\S]*$/g, '');

  // Remove capsule recommendation tags
  html = html.replace(/\[\[CAPSULE_RECOMMENDATION:\d+\]\]/g, '');
  html = html.replace(/\[\[CAPSULE_DECISION:.*?\]\]/g, '');

  // Bold
  html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  // Italic
  html = html.replace(/(?<!\*)\*([^*]+)\*(?!\*)/g, '<em>$1</em>');

  // Headers (## and ###)
  html = html.replace(/^### (.+)$/gm, '<h4>$1</h4>');
  html = html.replace(/^## (.+)$/gm, '<h3>$1</h3>');

  // Numbered lists
  html = html.replace(/^(\d+)\) (.+)$/gm, '<li class="numbered">$2</li>');
  html = html.replace(/^(\d+)\. (.+)$/gm, '<li class="numbered">$2</li>');

  // Bullet lists
  html = html.replace(/^- (.+)$/gm, '<li>$1</li>');
  html = html.replace(/^• (.+)$/gm, '<li>$1</li>');

  // Wrap consecutive <li> elements in <ul>
  html = html.replace(/((?:<li[^>]*>.*?<\/li>\s*)+)/g, '<ul>$1</ul>');

  // Paragraphs (double newlines)
  html = html.replace(/\n\n+/g, '</p><p>');
  // Single newlines to <br>
  html = html.replace(/\n/g, '<br>');

  // Wrap in paragraph if not starting with a block element
  if (!html.startsWith('<h') && !html.startsWith('<ul') && !html.startsWith('<p>')) {
    html = '<p>' + html + '</p>';
  }

  // Clean up empty paragraphs
  html = html.replace(/<p>\s*<\/p>/g, '');
  html = html.replace(/<p>\s*<br>\s*<\/p>/g, '');

  return html.trim();
}

function formatTime(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

function formatDateHeader(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

function buildFormulaCard(formula: ExportMessage['formula']): string {
  if (!formula) return '';

  const capsules = Math.round(formula.totalMg / 550);

  let html = `
    <div class="formula-card">
      <div class="formula-header">
        <div class="formula-icon">💊</div>
        <div>
          <div class="formula-title">Your Custom Formula</div>
          <div class="formula-subtitle">${capsules} capsules/day · ${formula.totalMg.toLocaleString()}mg total</div>
        </div>
      </div>`;

  // Bases (System Supports)
  if (formula.bases && formula.bases.length > 0) {
    html += `
      <div class="formula-section">
        <div class="formula-section-title">System Supports</div>
        <table class="formula-table">
          <thead>
            <tr>
              <th>Ingredient</th>
              <th>Dose</th>
              <th>Purpose</th>
            </tr>
          </thead>
          <tbody>`;

    for (const base of formula.bases) {
      html += `
            <tr>
              <td class="ingredient-name">${base.name}</td>
              <td class="ingredient-dose">${base.dose}</td>
              <td class="ingredient-purpose">${base.purpose}</td>
            </tr>`;
    }

    html += `
          </tbody>
        </table>
      </div>`;
  }

  // Individual Additions
  if (formula.additions && formula.additions.length > 0) {
    html += `
      <div class="formula-section">
        <div class="formula-section-title">Individual Ingredients</div>
        <table class="formula-table">
          <thead>
            <tr>
              <th>Ingredient</th>
              <th>Dose</th>
              <th>Purpose</th>
            </tr>
          </thead>
          <tbody>`;

    for (const addition of formula.additions) {
      html += `
            <tr>
              <td class="ingredient-name">${addition.name}</td>
              <td class="ingredient-dose">${addition.dose}</td>
              <td class="ingredient-purpose">${addition.purpose}</td>
            </tr>`;
    }

    html += `
          </tbody>
        </table>
      </div>`;
  }

  // Rationale
  if (formula.rationale) {
    html += `
      <div class="formula-rationale">
        <div class="rationale-label">Clinical Rationale</div>
        <p>${formula.rationale}</p>
      </div>`;
  }

  // Warnings
  if (formula.warnings && formula.warnings.length > 0) {
    html += `
      <div class="formula-warnings">
        <div class="warnings-label">⚠️ Important Warnings</div>
        <ul>`;
    for (const warning of formula.warnings) {
      html += `<li>${warning}</li>`;
    }
    html += `</ul></div>`;
  }

  // Disclaimers
  if (formula.disclaimers && formula.disclaimers.length > 0) {
    html += `
      <div class="formula-disclaimers">`;
    for (const disclaimer of formula.disclaimers) {
      html += `<p>${disclaimer}</p>`;
    }
    html += `</div>`;
  }

  html += `</div>`;
  return html;
}

export function generateConsultationHTML(data: ConsultationExportData): string {
  const { messages, exportDate, userName } = data;

  // Group messages by date
  const messagesByDate = new Map<string, ExportMessage[]>();
  for (const msg of messages) {
    const dateKey = formatDateHeader(msg.timestamp);
    if (!messagesByDate.has(dateKey)) {
      messagesByDate.set(dateKey, []);
    }
    messagesByDate.get(dateKey)!.push(msg);
  }

  // Count formulas
  const formulaCount = messages.filter(m => m.formula).length;
  const messageCount = messages.length;

  let messagesHtml = '';
  for (const [date, msgs] of messagesByDate) {
    messagesHtml += `<div class="date-divider"><span>${date}</span></div>`;

    for (const msg of msgs) {
      const isUser = msg.sender === 'user';
      const senderLabel = isUser ? (userName || 'You') : 'Ones';
      const bubbleClass = isUser ? 'message-user' : 'message-ai';
      const avatarContent = isUser
        ? `<div class="avatar avatar-user">${(userName || 'U').charAt(0).toUpperCase()}</div>`
        : `<div class="avatar avatar-ai">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"/>
              <path d="M12 6v6l4 2"/>
            </svg>
           </div>`;

      const contentHtml = markdownToHtml(msg.content);
      const formulaHtml = msg.formula ? buildFormulaCard(msg.formula) : '';

      messagesHtml += `
        <div class="message ${bubbleClass}">
          ${avatarContent}
          <div class="message-body">
            <div class="message-meta">
              <span class="sender-name">${senderLabel}</span>
              <span class="message-time">${formatTime(msg.timestamp)}</span>
            </div>
            <div class="message-content">${contentHtml}</div>
            ${formulaHtml}
          </div>
        </div>`;
    }
  }

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>ONES Consultation – ${new Date(exportDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');

    * { margin: 0; padding: 0; box-sizing: border-box; }

    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      background: #f8faf8;
      color: #1a1a1a;
      line-height: 1.6;
      -webkit-font-smoothing: antialiased;
    }

    .page-container {
      max-width: 800px;
      margin: 0 auto;
      padding: 40px 24px;
    }

    /* Header */
    .export-header {
      text-align: center;
      padding: 40px 32px;
      background: linear-gradient(135deg, #1B4332 0%, #2D6A4F 100%);
      border-radius: 16px;
      margin-bottom: 32px;
      color: white;
    }

    .brand-logo {
      margin-bottom: 12px;
    }

    .brand-logo img {
      height: 48px;
      width: auto;
    }

    .brand-tagline {
      font-size: 14px;
      opacity: 0.8;
      letter-spacing: 1px;
      margin-bottom: 24px;
    }

    .export-meta {
      display: flex;
      justify-content: center;
      gap: 32px;
      font-size: 13px;
      opacity: 0.9;
    }

    .export-meta-item {
      display: flex;
      align-items: center;
      gap: 6px;
    }

    /* Stats bar */
    .stats-bar {
      display: flex;
      gap: 16px;
      margin-bottom: 32px;
    }

    .stat-card {
      flex: 1;
      background: white;
      border: 1px solid #e8ece8;
      border-radius: 12px;
      padding: 16px 20px;
      text-align: center;
    }

    .stat-value {
      font-size: 24px;
      font-weight: 700;
      color: #1B4332;
    }

    .stat-label {
      font-size: 12px;
      color: #666;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-top: 4px;
    }

    /* Date Dividers */
    .date-divider {
      text-align: center;
      margin: 28px 0 20px;
      position: relative;
    }

    .date-divider::before {
      content: '';
      position: absolute;
      top: 50%;
      left: 0;
      right: 0;
      height: 1px;
      background: #dde3dd;
    }

    .date-divider span {
      position: relative;
      background: #f8faf8;
      padding: 0 16px;
      font-size: 13px;
      font-weight: 600;
      color: #888;
      letter-spacing: 0.3px;
    }

    /* Messages */
    .message {
      display: flex;
      gap: 12px;
      margin-bottom: 20px;
      align-items: flex-start;
    }

    .message-user {
      flex-direction: row-reverse;
    }

    .avatar {
      width: 36px;
      height: 36px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      font-size: 14px;
      font-weight: 600;
    }

    .avatar-user {
      background: #2D6A4F;
      color: white;
    }

    .avatar-ai {
      background: #1B4332;
      color: #B7E4C7;
    }

    .message-body {
      max-width: 85%;
      min-width: 0;
    }

    .message-user .message-body {
      text-align: right;
    }

    .message-meta {
      display: flex;
      gap: 8px;
      align-items: baseline;
      margin-bottom: 4px;
    }

    .message-user .message-meta {
      justify-content: flex-end;
    }

    .sender-name {
      font-size: 13px;
      font-weight: 600;
      color: #333;
    }

    .message-time {
      font-size: 11px;
      color: #999;
    }

    .message-content {
      background: white;
      border: 1px solid #e8ece8;
      border-radius: 12px;
      padding: 14px 18px;
      font-size: 14px;
      line-height: 1.7;
      color: #2a2a2a;
    }

    .message-user .message-content {
      background: #E8F5E9;
      border-color: #C8E6C9;
    }

    .message-content p { margin-bottom: 10px; }
    .message-content p:last-child { margin-bottom: 0; }
    .message-content h3 { font-size: 15px; font-weight: 700; margin: 16px 0 8px; color: #1B4332; }
    .message-content h4 { font-size: 14px; font-weight: 600; margin: 14px 0 6px; color: #2D6A4F; }
    .message-content ul { margin: 8px 0; padding-left: 20px; }
    .message-content li { margin-bottom: 4px; }
    .message-content strong { color: #1a1a1a; }

    /* Formula Cards */
    .formula-card {
      background: white;
      border: 2px solid #1B4332;
      border-radius: 16px;
      margin-top: 12px;
      overflow: hidden;
    }

    .formula-header {
      background: linear-gradient(135deg, #1B4332 0%, #2D6A4F 100%);
      color: white;
      padding: 20px 24px;
      display: flex;
      align-items: center;
      gap: 16px;
    }

    .formula-icon {
      font-size: 28px;
    }

    .formula-title {
      font-size: 18px;
      font-weight: 700;
    }

    .formula-subtitle {
      font-size: 13px;
      opacity: 0.85;
      margin-top: 2px;
    }

    .formula-section {
      padding: 20px 24px;
      border-bottom: 1px solid #eef2ee;
    }

    .formula-section-title {
      font-size: 13px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 1px;
      color: #1B4332;
      margin-bottom: 12px;
    }

    .formula-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 13px;
    }

    .formula-table th {
      text-align: left;
      padding: 8px 12px;
      background: #f5f7f5;
      color: #555;
      font-weight: 600;
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      border-bottom: 2px solid #e0e5e0;
    }

    .formula-table td {
      padding: 10px 12px;
      border-bottom: 1px solid #eef2ee;
      vertical-align: top;
    }

    .formula-table tr:last-child td {
      border-bottom: none;
    }

    .ingredient-name {
      font-weight: 600;
      color: #1B4332;
      white-space: nowrap;
    }

    .ingredient-dose {
      font-weight: 600;
      color: #2D6A4F;
      white-space: nowrap;
    }

    .ingredient-purpose {
      color: #555;
      line-height: 1.5;
    }

    .formula-rationale {
      padding: 20px 24px;
      background: #f5f7f5;
      border-bottom: 1px solid #eef2ee;
    }

    .rationale-label {
      font-size: 12px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #1B4332;
      margin-bottom: 8px;
    }

    .formula-rationale p {
      font-size: 13px;
      color: #555;
      line-height: 1.6;
    }

    .formula-warnings {
      padding: 16px 24px;
      background: #FFF8E1;
      border-bottom: 1px solid #eef2ee;
    }

    .warnings-label {
      font-size: 12px;
      font-weight: 700;
      color: #E65100;
      margin-bottom: 8px;
    }

    .formula-warnings ul {
      list-style: none;
      padding: 0;
    }

    .formula-warnings li {
      font-size: 13px;
      color: #795548;
      padding: 4px 0;
      padding-left: 8px;
      border-left: 3px solid #FFA726;
      margin-bottom: 6px;
    }

    .formula-disclaimers {
      padding: 16px 24px;
      background: #fafafa;
    }

    .formula-disclaimers p {
      font-size: 11px;
      color: #999;
      font-style: italic;
    }

    /* Footer */
    .export-footer {
      text-align: center;
      margin-top: 40px;
      padding-top: 24px;
      border-top: 1px solid #dde3dd;
      color: #999;
      font-size: 12px;
    }

    .export-footer .disclaimer {
      max-width: 600px;
      margin: 12px auto 0;
      font-size: 11px;
      line-height: 1.5;
      color: #aaa;
    }

    /* Print styles */
    @media print {
      body { background: white; }
      .page-container { padding: 0; max-width: none; }
      .export-header { border-radius: 0; margin-bottom: 24px; }
      .no-print { display: none !important; }
      .message-content { break-inside: avoid; }
      .formula-card { break-inside: avoid; }
      .stat-card { border-color: #ccc; }
    }

    /* Print button */
    .print-bar {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      background: white;
      border-bottom: 1px solid #e0e0e0;
      padding: 12px 24px;
      display: flex;
      justify-content: center;
      gap: 12px;
      z-index: 100;
      box-shadow: 0 2px 8px rgba(0,0,0,0.08);
    }

    .print-btn {
      background: #1B4332;
      color: white;
      border: none;
      padding: 8px 24px;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      font-family: inherit;
    }

    .print-btn:hover {
      background: #2D6A4F;
    }

    .print-btn-secondary {
      background: white;
      color: #333;
      border: 1px solid #ddd;
    }

    .print-btn-secondary:hover {
      background: #f5f5f5;
    }

    .print-spacer {
      height: 60px;
    }

    @media print {
      .print-bar { display: none; }
      .print-spacer { display: none; }
    }
  </style>
</head>
<body>
  <div class="print-bar no-print">
    <button class="print-btn" onclick="window.print()">🖨️ Print / Save as PDF</button>
    <button class="print-btn print-btn-secondary" onclick="window.close()">Close</button>
  </div>
  <div class="print-spacer no-print"></div>

  <div class="page-container">
    <div class="export-header">
      <div class="brand-logo"><img src="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjA0IiBoZWlnaHQ9IjIwNSIgdmlld0JveD0iMCAwIDYwNCAyMDUiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+DQo8ZyBjbGlwLXBhdGg9InVybCgjY2xpcDBfNDY4XzQ2KSI+DQo8cmVjdCB4PSI1MzAuNDc3IiB5PSIxNjAuNTAxIiB3aWR0aD0iNjAuNTIzMSIgaGVpZ2h0PSIyOS4xNzM4IiByeD0iMTQuNTg2OSIgZmlsbD0iIzk3OTk4MSIvPg0KPHBhdGggZD0iTTg1Ljc4NDkgMTg0LjUwOEMzOS41NDE1IDE4NC41MDggOC45MzU5MiAxNDkuNjU4IDguOTM1OTIgMTAxLjYyN0M4LjkzNTkyIDUzLjU5NjggMzkuNTQxNSAxOC45NzAxIDg1Ljc4NDkgMTguOTcwMUMxMzEuODA1IDE4Ljk3MDEgMTYyLjQxIDUzLjU5NjggMTYyLjQxIDEwMS42MjdDMTYyLjQxIDE0OS42NTggMTMxLjgwNSAxODQuNTA4IDg1Ljc4NDkgMTg0LjUwOFpNODUuNzg0OSAxNzAuMjExQzEyNS4xMDMgMTcwLjIxMSAxNDUuNDMyIDEzOS4zODIgMTQ1LjQzMiAxMDEuNjI3QzE0NS40MzIgNjMuODczMSAxMjUuMTAzIDMzLjI2NzYgODUuNzg0OSAzMy4yNjc2QzQ2LjI0MzQgMzMuMjY3NiAyNS45MTQyIDYzLjg3MzEgMjUuOTE0MiAxMDEuNjI3QzI1LjkxNDIgMTM5LjM4MiA0Ni4yNDM0IDE3MC4yMTEgODUuNzg0OSAxNzAuMjExWk0yMzcuODUxIDY0Ljk5MDFDMjU4LjE4IDY0Ljk5MDEgMjc1LjE1OCA3Ni4zODM0IDI3NS4xNTggMTAxLjYyN1YxODEuNjA0SDI2MC42MzhWMTA0Ljc1NUMyNjAuNjM4IDkwLjIzNDEgMjUzLjkzNiA3Ny43MjM4IDIzNC4yNzcgNzcuNzIzOEMyMTIuNjA3IDc3LjcyMzggMTk4LjMwOSA5Mi45MTQ5IDE5OC4zMDkgMTA5LjY3VjE4MS42MDRIMTgzLjc4OVY2Ny42NzA5SDE5OC4zMDlWODMuOTc5SDE5OC43NTZDMjA1LjIzNSA3NC41OTYyIDIxNy41MjIgNjQuOTkwMSAyMzcuODUxIDY0Ljk5MDFaTTQwMC43OTUgMTE5LjQ5OUM0MDAuNzk1IDEyMi42MjcgNDAwLjc5NSAxMjUuNzU0IDQwMC41NzIgMTI3LjU0MkgzMTAuMzE5QzMxMC41NDMgMTUwLjU1MiAzMjIuODI5IDE3Mi4yMjEgMzQ5LjYzNyAxNzIuMjIxQzM3My4wOTQgMTcyLjIyMSAzODIuMjUzIDE1Ni4xMzcgMzg0LjQ4NyAxNDYuNzU0SDM5OS4yMzJDMzkzLjY0NyAxNjcuNTMgMzc4LjAwOSAxODQuNzMyIDM0OS40MTQgMTg0LjczMkMzMTQuNTY0IDE4NC43MzIgMjk1LjEyOCAxNTkuMjY0IDI5NS4xMjggMTI0LjYzN0MyOTUuMTI4IDg4LjIyMzUgMzE2LjU3NCA2NC43NjY3IDM0OS40MTQgNjQuNzY2N0MzODIuMjUzIDY0Ljc2NjcgNDAwLjc5NSA4Ny43NzY3IDQwMC43OTUgMTE5LjQ5OVpNMzEwLjMxOSAxMTQuODA4SDM4NS4zODFDMzg1LjM4MSA5NC40Nzg3IDM3Mi4yIDc3LjI3NyAzNDguNzQ0IDc3LjI3N0MzMjYuNjI3IDc3LjI3NyAzMTEuNDM2IDkzLjU4NTEgMzEwLjMxOSAxMTQuODA4Wk00NjMuMTQ4IDE4NC41MDhDNDMxLjIwMiAxODQuNTA4IDQxMy43NzcgMTY3LjA4MyA0MTMuMTA3IDE0NC4yOTZINDI4LjI5OEM0MjkuMTkxIDE1OS45MzQgNDM5LjQ2OCAxNzEuNzc0IDQ2My4zNzEgMTcxLjc3NEM0ODUuMDQxIDE3MS43NzQgNDkyLjQxMyAxNjEuNzIyIDQ5Mi40MTMgMTUwLjU1MkM0OTIuNDEzIDEzMy43OTcgNDc1LjQzNSAxMzIuMDEgNDU5LjU3NCAxMjguMjEyQzQzOC41NzQgMTIyLjg1IDQxNy4zNTEgMTE3LjcxMiA0MTcuMzUxIDk1LjU5NTdDNDE3LjM1MSA3Ny4wNTM2IDQzMi4wOTYgNjQuOTkwMSA0NTcuNzg2IDY0Ljk5MDFDNDg3LjQ5OCA2NC45OTAxIDUwMS4zNDkgODAuODUxNCA1MDMuMzYgOTkuNjE2OEg0ODguMTY4QzQ4Ni4xNTggODkuNTYzOSA0ODAuMTI2IDc3LjcyMzggNDU4LjAxIDc3LjcyMzhDNDQxLjcwMiA3Ny43MjM4IDQzMi41NDIgODMuOTc5IDQzMi41NDIgOTQuNzAyMUM0MzIuNTQyIDEwOSA0NDcuOTU3IDExMS4wMSA0NjUuMTU4IDExNS4yNTVDNDg2LjYwNSAxMjAuMzkzIDUwNy44MjggMTI2LjQyNSA1MDcuODI4IDE1MC4xMDVDNTA3LjgyOCAxNzAuODgxIDQ5MS4yOTYgMTg0LjUwOCA0NjMuMTQ4IDE4NC41MDhaIiBmaWxsPSIjRjlFRkU4Ii8+DQo8L2c+DQo8ZGVmcz4NCjxjbGlwUGF0aCBpZD0iY2xpcDBfNDY4XzQ2Ij4NCjxyZWN0IHdpZHRoPSI2MDQiIGhlaWdodD0iMjA1IiBmaWxsPSJ3aGl0ZSIvPg0KPC9jbGlwUGF0aD4NCjwvZGVmcz4NCjwvc3ZnPg0K" alt="ONES" /></div>
      <div class="brand-tagline">Personalized Supplement Consultation</div>
      <div class="export-meta">
        <div class="export-meta-item">
          📅 ${new Date(exportDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
        </div>
        ${userName ? `<div class="export-meta-item">👤 ${userName}</div>` : ''}
      </div>
    </div>

    <div class="stats-bar">
      <div class="stat-card">
        <div class="stat-value">${messageCount}</div>
        <div class="stat-label">Messages</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">${formulaCount}</div>
        <div class="stat-label">Formula${formulaCount !== 1 ? 's' : ''} Created</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">${messagesByDate.size}</div>
        <div class="stat-label">Session Day${messagesByDate.size !== 1 ? 's' : ''}</div>
      </div>
    </div>

    ${messagesHtml}

    <div class="export-footer">
      <div>Exported from <strong>ONES</strong> on ${new Date(exportDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })}</div>
      <div class="disclaimer">
        This consultation record is for informational purposes only and does not constitute medical advice.
        Always consult your healthcare provider before starting any supplement regimen, especially if you
        take prescription medications.
      </div>
    </div>
  </div>
</body>
</html>`;
}

/**
 * Export the consultation as a formatted HTML file and open it in a new tab
 */
export function exportConsultationAsHTML(
  messages: Array<{
    sender: 'user' | 'ai' | 'system';
    content: string;
    timestamp: Date;
    formula?: ExportMessage['formula'];
  }>,
  sessionId: string | null,
  userName?: string
): void {
  const exportData: ConsultationExportData = {
    sessionId: sessionId || 'current',
    exportDate: new Date().toISOString(),
    userName,
    messages: messages.map(msg => ({
      sender: msg.sender,
      content: msg.content,
      timestamp: msg.timestamp instanceof Date ? msg.timestamp.toISOString() : String(msg.timestamp),
      formula: msg.formula,
    })),
  };

  const html = generateConsultationHTML(exportData);
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);

  // Open in new tab so user can view, print, or save as PDF
  const newWindow = window.open(url, '_blank');

  // If popup was blocked, fall back to download
  if (!newWindow) {
    const a = document.createElement('a');
    a.href = url;
    a.download = `ONES-Consultation-${new Date().toISOString().split('T')[0]}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  // Clean up object URL after a delay
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}
