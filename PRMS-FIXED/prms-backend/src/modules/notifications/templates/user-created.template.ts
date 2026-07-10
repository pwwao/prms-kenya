

export interface IUserCreatedTemplateData {
  role: 'System Admin' | 'Hospital Admin' | 'Clinician' | 'Receptionist';
  hospitalName?: string | null;
  loginUrl: string;
  temporaryPassword: string;
}

export function renderInApp(data: IUserCreatedTemplateData): {
  title: string;
  body: string;
} {
  return {
    title: 'Welcome to PRMS',
    body: `Your ${data.role} account has been created${data.hospitalName ? ` for ${data.hospitalName}` : ''}. Sign in with the details sent to your email.`,
  };
}

export function renderPush(data: IUserCreatedTemplateData): {
  title: string;
  body: string;
  data: Record<string, string>;
} {
  return {
    title: 'Welcome to PRMS',
    body: `Your ${data.role} account is ready${data.hospitalName ? ` for ${data.hospitalName}` : ''}.`,
    data: {
      type: 'USER_CREATED',
      role: data.role,
    },
  };
}

export function renderEmail(data: IUserCreatedTemplateData): {
  subject: string;
  html: string;
  text: string;
} {
  const subject = '[PRMS] Your account is ready';
  const facilityLine = data.hospitalName ? ` for ${data.hospitalName}` : '';

  const text = [
    `Your PRMS account has been created${facilityLine}.`,
    ``,
    `Role: ${data.role}`,
    `Login URL: ${data.loginUrl}`,
    `Temporary password: ${data.temporaryPassword}`,
    ``,
    `Please sign in and change your password after your first login.`,
    ``,
    `If you did not expect this email, please contact your administrator immediately.`,
  ].join('\n');

  const html = `
    <div style="font-family: Arial, sans-serif; color: #1a1a1a;">
      <h2 style="color: #0b5fff;">Welcome to PRMS</h2>
      <p>Your PRMS account has been created${facilityLine}.</p>
      <table style="border-collapse: collapse; margin: 16px 0;">
        <tr><td style="padding: 4px 12px; font-weight: bold;">Role</td><td style="padding: 4px 12px;">${data.role}</td></tr>
        <tr><td style="padding: 4px 12px; font-weight: bold;">Login URL</td><td style="padding: 4px 12px;"><a href="${data.loginUrl}" style="color: #0b5fff;">${data.loginUrl}</a></td></tr>
        <tr><td style="padding: 4px 12px; font-weight: bold;">Temporary password</td><td style="padding: 4px 12px;">${data.temporaryPassword}</td></tr>
      </table>
      <p>Please sign in and change your password after your first login.</p>
      <p>If you did not expect this email, please contact your administrator immediately.</p>
      <p style="color: #888; font-size: 12px;">This is an automated message from PRMS Kenya. Do not reply to this email.</p>
    </div>
  `;

  return { subject, html, text };
}
