import { Buffer } from 'buffer';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST,PATCH');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const GITHUB_TOKEN = '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';
  const getFileUrl = 'https://api.github.com/repos/Tharak37/MyInverterShop/contents/data.json';

  // Helper to fetch and decode data.json from Git
  async function getGitData() {
    const response = await fetch(getFileUrl, {
      headers: { "Authorization": `token ${GITHUB_TOKEN}`, "User-Agent": "Vercel-Serverless" }
    });
    if (!response.ok) throw new Error("Failed to pull repository logs.");
    const fileData = await response.json();
    const content = Buffer.from(fileData.content, 'base64').toString('utf-8');
    return { array: JSON.parse(content), sha: fileData.sha };
  }

  // Helper to commit and push encoded text back to Git
  async function pushGitData(updatedArray, sha, messageText) {
    const updatedContentBase64 = Buffer.from(JSON.stringify(updatedArray, null, 2)).toString('base64');
    const updateResponse = await fetch(getFileUrl, {
      method: "PUT",
      headers: { "Authorization": `token ${GITHUB_TOKEN}`, "Content-Type": "application/json", "User-Agent": "Vercel-Serverless" },
      body: JSON.stringify({ message: messageText, content: updatedContentBase64, sha })
    });
    return updateResponse.ok;
  }

  // GET: Fetch tracking lists
  if (req.method === 'GET') {
    try {
      const { array } = await getGitData();
      return res.status(200).json(array);
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  // POST: Add new device intake records
  if (req.method === 'POST') {
    try {
      const { array, sha } = await getGitData();
      array.unshift(req.body);
      const success = await pushGitData(array, sha, `🔧 Intake Added: ${req.body.id}`);
      return success ? res.status(200).json({ success: true }) : res.status(500).json({ error: "Git write error" });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  // PATCH: Modify a record's current state/status dynamically
  if (req.method === 'PATCH') {
    try {
      const { jobId, newStatus } = req.body;
      const { array, sha } = await getGitData();
      
      const jobIndex = array.findIndex(job => job.id === jobId);
      if (jobIndex === -1) return res.status(404).json({ error: "Record tracker mismatch" });
      
      array[jobIndex].status = newStatus; // Mutate targeted structural parameter
      
      const success = await pushGitData(array, sha, `📈 Status Updated: ${jobId} -> ${newStatus}`);
      return success ? res.status(200).json({ success: true }) : res.status(500).json({ error: "Git modification commit failed" });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  return res.status(405).json({ error: "Method not supported" });
}
