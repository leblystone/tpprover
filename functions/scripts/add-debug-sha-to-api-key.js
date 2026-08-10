const { GoogleAuth } = require('google-auth-library');

const KEY_NAME = 'projects/97564473391/locations/global/keys/4ca802d4-3e72-4135-a9fe-b0b595b7bd72';
const DEBUG_SHA1 = '4fe2d167c6ad2014ed60665f8ae36f6013a4f402';
const PACKAGE_NAME = 'com.thepepplanner.app';

(async () => {
  const auth = new GoogleAuth({ scopes: ['https://www.googleapis.com/auth/cloud-platform'] });
  const client = await auth.getClient();

  const getRes = await client.request({ url: `https://apikeys.googleapis.com/v2/${KEY_NAME}` });
  const key = getRes.data;
  const existing = key.restrictions?.androidKeyRestrictions?.allowedApplications || [];

  const alreadyPresent = existing.some(
    (a) => a.sha1Fingerprint?.toLowerCase() === DEBUG_SHA1 && a.packageName === PACKAGE_NAME
  );
  if (alreadyPresent) {
    console.log('Debug SHA1 already present in allowedApplications. Nothing to do.');
    return;
  }

  const updatedRestrictions = {
    ...key.restrictions,
    androidKeyRestrictions: {
      allowedApplications: [
        ...existing,
        { sha1Fingerprint: DEBUG_SHA1, packageName: PACKAGE_NAME },
      ],
    },
  };

  const patchRes = await client.request({
    url: `https://apikeys.googleapis.com/v2/${KEY_NAME}?updateMask=restrictions`,
    method: 'PATCH',
    data: { restrictions: updatedRestrictions },
  });

  console.log('Patch submitted. Operation:', JSON.stringify(patchRes.data.name || patchRes.data, null, 2));
})().catch((e) => {
  console.error('ERROR:', e.response?.data ? JSON.stringify(e.response.data, null, 2) : e.message);
  process.exit(1);
});
