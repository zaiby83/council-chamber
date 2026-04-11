import { TranscriptEntry } from '../components/TranscriptPanel';

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

function formatTimeSRT(ms: number): string {
  const hours = Math.floor(ms / 3600000);
  const minutes = Math.floor((ms % 3600000) / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  const milliseconds = ms % 1000;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')},${String(milliseconds).padStart(3, '0')}`;
}

export function exportAsText(entries: TranscriptEntry[]): void {
  const text = entries
    .map((e) => {
      const speaker = e.speakerTitle ? `${e.speaker} (${e.speakerTitle})` : e.speaker;
      return `[${formatTime(e.timestamp)}] ${speaker}:\n${e.text}\n`;
    })
    .join('\n');

  downloadFile(text, 'transcript.txt', 'text/plain');
}

export function exportAsJSON(entries: TranscriptEntry[]): void {
  const json = JSON.stringify(entries, null, 2);
  downloadFile(json, 'transcript.json', 'application/json');
}

export function exportAsSRT(entries: TranscriptEntry[]): void {
  const startTime = new Date(entries[0]?.timestamp).getTime();
  
  const srt = entries
    .map((e, i) => {
      const entryStart = new Date(e.timestamp).getTime() - startTime;
      const entryEnd = i < entries.length - 1
        ? new Date(entries[i + 1].timestamp).getTime() - startTime
        : entryStart + 3000; // 3 seconds for last entry

      const speaker = e.speakerTitle ? `${e.speaker} (${e.speakerTitle})` : e.speaker;
      
      return `${i + 1}\n${formatTimeSRT(entryStart)} --> ${formatTimeSRT(entryEnd)}\n${speaker}: ${e.text}\n`;
    })
    .join('\n');

  downloadFile(srt, 'transcript.srt', 'text/plain');
}

export function exportAsHTML(entries: TranscriptEntry[], cityName: string, chamberName: string): void {
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${cityName} - ${chamberName} Transcript</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      max-width: 900px;
      margin: 40px auto;
      padding: 20px;
      line-height: 1.6;
      color: #333;
    }
    header {
      border-bottom: 3px solid #0f4c81;
      padding-bottom: 20px;
      margin-bottom: 30px;
    }
    h1 {
      color: #0f4c81;
      margin: 0 0 5px 0;
    }
    .subtitle {
      color: #666;
      font-size: 14px;
    }
    .entry {
      margin-bottom: 20px;
      padding: 15px;
      background: #f5f5f5;
      border-radius: 8px;
      border-left: 4px solid #0f4c81;
    }
    .entry-header {
      display: flex;
      justify-content: space-between;
      margin-bottom: 8px;
      font-size: 14px;
    }
    .speaker {
      font-weight: 600;
      color: #0f4c81;
    }
    .speaker-title {
      color: #999;
      font-size: 12px;
      margin-left: 8px;
    }
    .timestamp {
      color: #999;
      font-size: 12px;
    }
    .text {
      color: #333;
    }
    footer {
      margin-top: 40px;
      padding-top: 20px;
      border-top: 1px solid #ddd;
      text-align: center;
      color: #999;
      font-size: 12px;
    }
  </style>
</head>
<body>
  <header>
    <h1>${cityName}</h1>
    <div class="subtitle">${chamberName} - Meeting Transcript</div>
    <div class="subtitle">Generated: ${new Date().toLocaleString()}</div>
  </header>
  <main>
    ${entries
      .map(
        (e) => `
    <div class="entry">
      <div class="entry-header">
        <div>
          <span class="speaker">${e.speaker}</span>
          ${e.speakerTitle ? `<span class="speaker-title">${e.speakerTitle}</span>` : ''}
        </div>
        <span class="timestamp">${formatTime(e.timestamp)}</span>
      </div>
      <div class="text">${e.text}</div>
    </div>`
      )
      .join('')}
  </main>
  <footer>
    Council Chamber Live Transcription System
  </footer>
</body>
</html>`;

  downloadFile(html, 'transcript.html', 'text/html');
}

function downloadFile(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
