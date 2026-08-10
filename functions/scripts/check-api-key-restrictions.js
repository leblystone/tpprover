const { GoogleAuth } = require('google-auth-library');

(async () => {
  const auth = new GoogleAuth({ scopes: ['https://www.googleapis.com/auth/cloud-platform'] });
  const client = await auth.getClient();
  const projectId = 'tpp-splendide';

  const listRes = await client.request({
    url: `https://apikeys.googleapis.com/v2/projects/${projectId}/locations/global/keys`,
  });
  const keys = listRes.data.keys || [];
  console.log(`Found ${keys.length} API key(s) in project.`);
  for (const k of keys) {
    console.log('---');
    console.log('name:', k.name);
    console.log('displayName:', k.displayName);
    const getRes = await client.request({ url: `https://apikeys.googleapis.com/v2/${k.name}` });
    const detail = getRes.data;
    console.log('restrictions:', JSON.stringify(detail.restrictions, null, 2));
  }
})().catch((e) => {
  console.error('ERROR:', e.response?.data ? JSON.stringify(e.response.data, null, 2) : e.message);
  process.exit(1);
});
