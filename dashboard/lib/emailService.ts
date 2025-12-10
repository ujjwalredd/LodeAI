import FormData from "form-data";
import Mailgun from "mailgun.js";

interface AssignmentEmailData {
  candidateEmail: string;
  candidateName: string;
  jobTitle: string;
  jobDescription: string;
  dashboardUrl: string;
}

class EmailService {
  private mailgun: Mailgun;
  private mg: any;

  constructor() {
    this.mailgun = new Mailgun(FormData);
    this.mg = this.mailgun.client({
      username: "api",
      key: process.env.MAILGUN_API_KEY || "e44bf14a420b74a96b0a8bdf5e08cc0a-8b22cbee-49afdfe4",
      // When you have an EU-domain, you must specify the endpoint:
      // url: "https://api.eu.mailgun.net"
    });
  }

  async sendAssignmentNotification(data: AssignmentEmailData): Promise<boolean> {
    try {
      const emailContent = this.generateAssignmentEmail(data);
      
      const emailData = await this.mg.messages.create(
        process.env.MAILGUN_DOMAIN || "sandbox00b1f51796f44b8b8c4410981687e051.mailgun.org",
        {
          from: process.env.MAILGUN_FROM || "LodeAI Assessments <postmaster@sandbox00b1f51796f44b8b8c4410981687e051.mailgun.org>",
          to: [data.candidateEmail],
          subject: `🎯 New Assessment Assignment: ${data.jobTitle}`,
          html: emailContent,
        }
      );

      console.log('Email sent successfully:', emailData);
      return true;
    } catch (error) {
      console.error('Failed to send email:', error);
      return false;
    }
  }

  private generateAssignmentEmail(data: AssignmentEmailData): string {
    return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>New Assessment Assignment</title>
        <style>
            body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Inter', system-ui, Roboto, Helvetica, Arial, sans-serif;
                line-height: 1.6;
                color: #333;
                max-width: 600px;
                margin: 0 auto;
                padding: 20px;
                background-color: #f5f5f5;
            }
            .container {
                background: white;
                border-radius: 12px;
                padding: 30px;
                box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            }
            .header {
                text-align: center;
                margin-bottom: 30px;
                padding-bottom: 20px;
                border-bottom: 2px solid #000;
            }
            .logo {
                font-size: 28px;
                font-weight: 800;
                color: #000;
                margin-bottom: 10px;
            }
            .greeting {
                font-size: 18px;
                color: #666;
                margin-bottom: 20px;
            }
            .assignment-box {
                background: #f8f9fa;
                border-left: 4px solid #000;
                padding: 20px;
                margin: 20px 0;
                border-radius: 8px;
            }
            .job-title {
                font-size: 20px;
                font-weight: 700;
                color: #000;
                margin-bottom: 10px;
            }
            .job-description {
                color: #666;
                line-height: 1.6;
                margin-bottom: 20px;
            }
            .steps {
                background: #fff;
                border: 1px solid #e0e0e0;
                border-radius: 8px;
                padding: 20px;
                margin: 20px 0;
            }
            .step {
                margin-bottom: 15px;
                padding-left: 30px;
                position: relative;
            }
            .step-number {
                position: absolute;
                left: 0;
                top: 0;
                background: #000;
                color: white;
                width: 20px;
                height: 20px;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 12px;
                font-weight: bold;
            }
            .step-title {
                font-weight: 600;
                color: #000;
                margin-bottom: 5px;
            }
            .step-description {
                color: #666;
                font-size: 14px;
            }
            .code-block {
                background: #f4f4f4;
                border: 1px solid #ddd;
                border-radius: 4px;
                padding: 10px;
                font-family: 'Courier New', monospace;
                font-size: 13px;
                margin: 10px 0;
                overflow-x: auto;
            }
            .button {
                display: inline-block;
                background: #000;
                color: white;
                padding: 12px 24px;
                text-decoration: none;
                border-radius: 8px;
                font-weight: 600;
                margin: 10px 0;
            }
            .footer {
                margin-top: 30px;
                padding-top: 20px;
                border-top: 1px solid #e0e0e0;
                text-align: center;
                color: #666;
                font-size: 14px;
            }
            .warning {
                background: #fff3cd;
                border: 1px solid #ffeaa7;
                border-radius: 8px;
                padding: 15px;
                margin: 20px 0;
                color: #856404;
            }
            .highlight {
                background: #e3f2fd;
                border-left: 4px solid #2196f3;
                padding: 15px;
                margin: 15px 0;
                border-radius: 4px;
            }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <div class="logo">LodeAI</div>
                <p class="greeting">Hello ${data.candidateName || 'Candidate'}!</p>
            </div>

            <p>Great news! You have been assigned a new technical assessment. Our AI-powered platform will guide you through the entire process.</p>

            <div class="assignment-box">
                <div class="job-title">${data.jobTitle}</div>
                <div class="job-description">${data.jobDescription.substring(0, 200)}${data.jobDescription.length > 200 ? '...' : ''}</div>
            </div>

            <div class="highlight">
                <strong>🚀 What's Next?</strong><br>
                Follow the steps below to start your assessment. The entire process is automated and guided by AI assistants.
            </div>

            <div class="steps">
                <h3 style="margin-top: 0; color: #000;">📋 Step-by-Step Instructions</h3>
                
                <div class="step">
                    <div class="step-number">1</div>
                    <div class="step-title">Install VSCode</div>
                    <div class="step-description">
                        Download and install Visual Studio Code from <a href="https://code.visualstudio.com/" target="_blank">code.visualstudio.com</a>
                        <div class="code-block">
                            # Choose your operating system:<br>
                            # Windows: Download .exe file<br>
                            # macOS: Download .dmg file<br>
                            # Linux: Download .deb or .rpm package
                        </div>
                    </div>
                </div>

                <div class="step">
                    <div class="step-number">2</div>
                    <div class="step-title">Install LodeAI Extension</div>
                    <div class="step-description">
                        Open VSCode and install the LodeAI extension:
                        <div class="code-block">
                            1. Open VSCode<br>
                            2. Go to Extensions (Ctrl+Shift+X)<br>
                            3. Search for "LodeAI"<br>
                            4. Click Install
                        </div>
                    </div>
                </div>

                <div class="step">
                    <div class="step-number">3</div>
                    <div class="step-title">Start Assessment</div>
                    <div class="step-description">
                        Launch the LodeAI extension and authenticate:
                        <div class="code-block">
                            1. Click the LodeAI icon in VSCode sidebar<br>
                            2. Enter your email: <strong>${data.candidateEmail}</strong><br>
                            3. Click "Continue"<br>
                            4. Select your preferred programming language
                        </div>
                    </div>
                </div>

                <div class="step">
                    <div class="step-number">4</div>
                    <div class="step-title">AI-Guided Development</div>
                    <div class="step-description">
                        Our AI will automatically:
                        <ul>
                            <li>Create your assessment environment</li>
                            <li>Set up project structure</li>
                            <li>Provide step-by-step guidance</li>
                            <li>Run tests and validate your code</li>
                        </ul>
                    </div>
                </div>
            </div>

            <div class="warning">
                <strong>⚠️ Important:</strong><br>
                • Use the exact email address: <strong>${data.candidateEmail}</strong><br>
                • Make sure you have a stable internet connection<br>
                • The assessment will be created in a new VSCode window<br>
                • Save your work frequently
            </div>

            <div style="text-align: center; margin: 30px 0;">
                <a href="https://code.visualstudio.com/" class="button" target="_blank">Download VSCode</a>
            </div>

            <div class="footer">
                <p><strong>Need Help?</strong></p>
                <p>If you encounter any issues, please contact your recruiter or check our dashboard at <a href="${data.dashboardUrl}" target="_blank">${data.dashboardUrl}</a></p>
                <p style="margin-top: 20px; font-size: 12px; color: #999;">
                    This assessment was created using LodeAI - AI-Powered Technical Assessment Platform
                </p>
            </div>
        </div>
    </body>
    </html>
    `;
  }
}

export const emailService = new EmailService();
