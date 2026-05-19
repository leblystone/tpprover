/** Gmail web compose — avoids Windows opening mailto: in OneDrive/Outlook. */
export const TPP_GMAIL_SEND_AS = 'contact@thepepplanner.com';

/**
 * @param {{ to?: string, subject?: string, body?: string, fromAccount?: string }} opts
 */
export function gmailComposeUrl({
  to = '',
  subject = '',
  body = '',
  fromAccount = TPP_GMAIL_SEND_AS,
} = {}) {
  const params = new URLSearchParams({
    authuser: fromAccount,
    view: 'cm',
    fs: '1',
  });
  if (to) params.set('to', to);
  if (subject) params.set('su', subject);
  if (body) params.set('body', body);
  return `https://mail.google.com/mail/?${params.toString()}`;
}
