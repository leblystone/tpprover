/**
 * Shared admin email shell — header (logo bar) + footer.
 * Must stay in sync with generateDefaultHTML() in emailService.js.
 */

const DEFAULT_EMAIL_COLORS = {
  primary: '#344E41',
  primaryLight: '#3A5A40',
  secondary: '#A3B18A',
  sage: '#D4D7CD',
  white: '#FFFFFF',
  text: '#1F2937',
  textLight: '#6B7280',
  border: '#E5E7EB',
};

function escapeHtml(text) {
  if (!text) return '';
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Wrap email body HTML in the standard admin template chrome.
 * @param {string} mainContentHtml - Inner content (placed in main section)
 * @param {object} colors
 * @param {{ showSignature?: boolean }} options
 */
function wrapAdminEmailLayout(mainContentHtml, colors = DEFAULT_EMAIL_COLORS, options = {}) {
  const LOGO_URL = process.env.LOGO_URL || 'https://thepepplanner.app/tpp_logo.png';
  const showSignature = options.showSignature !== false;

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&family=Cedarville+Cursive&display=swap" rel="stylesheet">
</head>
<body style="margin: 0; padding: 0; font-family: 'Poppins', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background-color: #F5F5F0;">
  <div style="background-color: #FFFFFF; padding: 16px 0; border-bottom: 1px solid #DDE6DE;">
    <table width="100%" cellspacing="0" cellpadding="0" style="border-collapse: collapse; max-width: 600px; margin: 0 auto;">
      <tr>
        <td width="33%" valign="middle" align="center" style="padding: 0 16px;">
          <p style="margin: 0; font-size: 10px; font-weight: 500; letter-spacing: 0.15em; text-transform: uppercase; color: #9CA3AF; font-family: 'Poppins', sans-serif;">
            Organize Your Research
          </p>
        </td>
        <td width="34%" valign="middle" align="center">
          <a href="https://thepepplanner.app/app/dashboard" style="display: inline-block; text-decoration: none;">
            <img src="${LOGO_URL}" alt="The Pep Planner" style="width: 64px; height: 64px; border-radius: 50%; display: block; margin: 0 auto; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);" onerror="this.style.display='none';" />
          </a>
        </td>
        <td width="33%" valign="middle" align="center" style="padding: 0 16px;">
          <a href="https://thepepplanner.app/app/dashboard" style="color: ${colors.primary}; text-decoration: none; font-size: 13px; font-weight: 500; font-family: 'Poppins', sans-serif;">
            Dashboard →
          </a>
        </td>
      </tr>
    </table>
  </div>

  <div style="background-color: #F5F5F0; padding: 0 20px;">
    <div style="max-width: 600px; margin: 0 auto;">
      <div style="background-color: #F5F5F0; padding: 40px 32px; color: ${colors.text};">
        ${mainContentHtml}
      </div>

      ${showSignature ? `
      <div style="padding: 0 32px 40px 32px; color: ${colors.text};">
        <div style="text-align: center; padding-top: 0;">
          <p style="font-size: 16px; line-height: 1.6; color: ${colors.text}; margin: 0;">
            Happy researching,
          </p>
          <p style="font-size: 16px; font-weight: 700; color: ${colors.primary}; margin: 4px 0 0 0;">
            The Pep Planner Team
          </p>
        </div>
      </div>
      ` : ''}
    </div>
  </div>

  <div style="background-color: #2F3B3A; padding: 32px 0; text-align: center;">
    <div style="max-width: 600px; margin: 0 auto; padding: 0 16px;">
      <p style="margin: 0 0 8px 0; font-size: 13px; color: #A0B9B3;">
        © ${new Date().getFullYear()} The Pep Planner. All rights reserved.
      </p>
      <p style="margin: 0; font-size: 16px; color: #D1D9D6; font-family: 'Cedarville Cursive', cursive; font-style: italic;">
        — for the love of research
      </p>
    </div>
  </div>
</body>
</html>
  `.trim();
}

module.exports = {
  DEFAULT_EMAIL_COLORS,
  escapeHtml,
  wrapAdminEmailLayout,
};
