// 1회용 슬랙 봇 발송 — 비공개 데이터 저장소의 _slack_once.json({channel,text})을 RACEMENT Alarm 봇으로 보낸다.
// 공개 저장소의 Actions 로그라 메시지 내용은 출력하지 않고 결과(ok·ts)만 찍는다. 발송 후 이 파일과 워크플로는 삭제한다.
const PAT = process.env.DATA_REPO_PAT, TOKEN = (process.env.SLACK_BOT_TOKEN || '').trim();
(async () => {
  const r = await fetch('https://api.github.com/repos/kimchic1212-sudo/stock-rcm-data/contents/_slack_once.json', {
    headers: { Authorization: `Bearer ${PAT}`, Accept: 'application/vnd.github.raw', 'User-Agent': 'slack-once' },
  });
  if (!r.ok) throw new Error('메시지 파일 읽기 실패 ' + r.status);
  const { channel, text } = await r.json();
  const s = await fetch('https://slack.com/api/chat.postMessage', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${TOKEN}` },
    body: JSON.stringify({ channel, text, mrkdwn: true }),
  });
  const j = await s.json();
  console.log('slack ok=', j.ok, 'ts=', j.ts || '', 'error=', j.error || '');
  if (!j.ok) process.exit(1);
})().catch((e) => { console.error(e.message); process.exit(1); });
