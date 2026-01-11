import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Resend } from "resend";

interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private resend: Resend;
  private readonly fromEmail: string;

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.get<string>("RESEND_API_KEY");
    if (!apiKey) {
      throw new Error("RESEND_API_KEY environment variable is not set");
    }

    this.resend = new Resend(apiKey);
    this.fromEmail =
      this.configService.get<string>("EMAIL_FROM") || "noreply@yourdomain.com";
  }

  async sendEmail(options: SendEmailOptions): Promise<void> {
    try {
      const { error } = await this.resend.emails.send({
        from: this.fromEmail,
        to: options.to,
        subject: options.subject,
        html: options.html,
      });

      if (error) {
        this.logger.error(
          `Failed to send email to ${options.to}:`,
          error.message,
        );
        throw new Error(`Email send failed: ${error.message}`);
      }

      this.logger.log(`Email sent successfully to ${options.to}`);
    } catch (error) {
      this.logger.error(`Error sending email to ${options.to}:`, error);
      throw error;
    }
  }

  async sendEmailVerification(
    email: string,
    firstName: string,
    token: string,
  ): Promise<void> {
    const appUrl = this.configService.get<string>("APP_URL");
    const verificationUrl = `${appUrl}/auth/verify-email?token=${token}`;

    const html = `
      <!DOCTYPE html>
      <html lang="fr">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Vérification de votre email</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
        <table role="presentation" style="width: 100%; border-collapse: collapse;">
          <tr>
            <td align="center" style="padding: 40px 0;">
              <table role="presentation" style="width: 600px; border-collapse: collapse; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                <!-- Header -->
                <tr>
                  <td style="padding: 40px 40px 20px 40px; text-align: center; background-color: #4F46E5; border-radius: 8px 8px 0 0;">
                    <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: bold;">
                      Vérification de votre email
                    </h1>
                  </td>
                </tr>
                
                <!-- Body -->
                <tr>
                  <td style="padding: 40px;">
                    <p style="margin: 0 0 20px 0; color: #333333; font-size: 16px; line-height: 1.6;">
                      Bonjour <strong>${firstName}</strong>,
                    </p>
                    
                    <p style="margin: 0 0 20px 0; color: #333333; font-size: 16px; line-height: 1.6;">
                      Merci de vous être inscrit sur notre plateforme de signature électronique <strong>Màndarga</strong> ! Pour activer votre compte, veuillez cliquer sur le bouton ci-dessous pour vérifier votre adresse email.
                    </p>
                    
                    <table role="presentation" style="margin: 30px 0; width: 100%;">
                      <tr>
                        <td align="center">
                          <a href="${verificationUrl}" 
                             style="display: inline-block; padding: 16px 40px; background-color: #4F46E5; color: #ffffff; text-decoration: none; border-radius: 6px; font-size: 16px; font-weight: bold;">
                            Vérifier mon email
                          </a>
                        </td>
                      </tr>
                    </table>
                    
                    <p style="margin: 20px 0; color: #666666; font-size: 14px; line-height: 1.6;">
                      Si le bouton ne fonctionne pas, copiez et collez ce lien dans votre navigateur :
                    </p>
                    
                    <p style="margin: 0 0 20px 0; padding: 15px; background-color: #f8f9fa; border-radius: 4px; word-break: break-all;">
                      <a href="${verificationUrl}" style="color: #4F46E5; text-decoration: none; font-size: 14px;">
                        ${verificationUrl}
                      </a>
                    </p>
                    
                    <p style="margin: 20px 0 0 0; color: #999999; font-size: 14px; line-height: 1.6;">
                      Ce lien expirera dans 24 heures pour des raisons de sécurité.
                    </p>
                  </td>
                </tr>
                
                <!-- Footer -->
                <tr>
                  <td style="padding: 30px 40px; background-color: #f8f9fa; border-radius: 0 0 8px 8px; border-top: 1px solid #e9ecef;">
                    <p style="margin: 0 0 10px 0; color: #666666; font-size: 12px; line-height: 1.6;">
                      Si vous n'avez pas créé de compte, vous pouvez ignorer cet email en toute sécurité.
                    </p>
                    <p style="margin: 0; color: #999999; font-size: 12px;">
                      © ${new Date().getFullYear()} Votre Application. Tous droits réservés.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `;

    await this.sendEmail({
      to: email,
      subject: "Vérifiez votre adresse email",
      html,
    });
  }

  async sendWelcomeEmail(email: string, firstName: string): Promise<void> {
    const html = `
      <!DOCTYPE html>
      <html lang="fr">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Bienvenue</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
        <table role="presentation" style="width: 100%; border-collapse: collapse;">
          <tr>
            <td align="center" style="padding: 40px 0;">
              <table role="presentation" style="width: 600px; border-collapse: collapse; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                <tr>
                  <td style="padding: 40px 40px 20px 40px; text-align: center; background-color: #10B981; border-radius: 8px 8px 0 0;">
                    <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: bold;">
                      🎉 Bienvenue !
                    </h1>
                  </td>
                </tr>
                
                <tr>
                  <td style="padding: 40px;">
                    <p style="margin: 0 0 20px 0; color: #333333; font-size: 16px; line-height: 1.6;">
                      Bonjour <strong>${firstName}</strong>,
                    </p>
                    
                    <p style="margin: 0 0 20px 0; color: #333333; font-size: 16px; line-height: 1.6;">
                      Votre email a été vérifié avec succès ! Votre compte est maintenant actif et vous pouvez profiter de toutes les fonctionnalités de notre application.
                    </p>
                    
                    <p style="margin: 0; color: #666666; font-size: 14px; line-height: 1.6;">
                      Merci de nous avoir rejoints !
                    </p>
                  </td>
                </tr>
                
                <tr>
                  <td style="padding: 30px 40px; background-color: #f8f9fa; border-radius: 0 0 8px 8px; border-top: 1px solid #e9ecef;">
                    <p style="margin: 0; color: #999999; font-size: 12px;">
                      © ${new Date().getFullYear()} Votre Application. Tous droits réservés.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `;

    await this.sendEmail({
      to: email,
      subject: "Bienvenue ! Votre email est vérifié",
      html,
    });
  }

  async sendSignatureInvitation(
    email: string,
    signerName: string,
    documentName: string,
    token: string,
    otp?: string,
  ): Promise<void> {
    const signUrl = `${this.configService.get("APP_URL")}/sign/${token}`;

    let otpSection = "";
    if (otp) {
      otpSection = `
        <table role="presentation" style="margin: 30px 0; width: 100%;">
          <tr>
            <td style="padding: 20px; background-color: #f8f9fa; border-radius: 4px; text-align: center;">
              <p style="margin: 0 0 10px 0; color: #333333; font-size: 14px; line-height: 1.6;">
                <strong>Votre code OTP :</strong>
              </p>
              <p style="margin: 0; color: #4F46E5; font-size: 24px; font-weight: bold; letter-spacing: 2px;">
                ${otp}
              </p>
              <p style="margin: 10px 0 0 0; color: #666666; font-size: 12px; line-height: 1.6;">
                <em>Ce code expire dans 10 minutes.</em>
              </p>
            </td>
          </tr>
        </table>
      `;
    }

    await this.sendEmail({
      to: email,
      subject: `Invitation à signer : ${documentName}`,
      html: `
        <!DOCTYPE html>
        <html lang="fr">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Invitation à signer</title>
        </head>
        <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
          <table role="presentation" style="width: 100%; border-collapse: collapse;">
            <tr>
              <td align="center" style="padding: 40px 0;">
                <table role="presentation" style="width: 600px; border-collapse: collapse; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                  <!-- Header -->
                  <tr>
                    <td style="padding: 40px 40px 0; text-align: center;">
                      <h1 style="margin: 0; color: #333333; font-size: 28px; font-weight: bold;">
                        Invitation à signer
                      </h1>
                    </td>
                  </tr>
                  
                  <!-- Body -->
                  <tr>
                    <td style="padding: 40px;">
                      <p style="margin: 0 0 20px 0; color: #333333; font-size: 16px; line-height: 1.6;">
                        Bonjour <strong>${signerName}</strong>,
                      </p>
                      
                      <p style="margin: 0 0 20px 0; color: #333333; font-size: 16px; line-height: 1.6;">
                        Vous êtes invité(e) à signer électroniquement le document <strong>${documentName}</strong> sur notre plateforme de signature électronique <strong>Màndarga</strong>.
                      </p>
                      
                      ${otpSection}
                      
                      <table role="presentation" style="margin: 30px 0; width: 100%;">
                        <tr>
                          <td align="center">
                            <a href="${signUrl}" 
                               style="display: inline-block; padding: 16px 40px; background-color: #4F46E5; color: #ffffff; text-decoration: none; border-radius: 6px; font-size: 16px; font-weight: bold;">
                              Accéder au document
                            </a>
                          </td>
                        </tr>
                      </table>
                      
                      <p style="margin: 20px 0; color: #666666; font-size: 14px; line-height: 1.6;">
                        Si le bouton ne fonctionne pas, copiez et collez ce lien dans votre navigateur :
                      </p>
                      
                      <p style="margin: 0 0 20px 0; padding: 15px; background-color: #f8f9fa; border-radius: 4px; word-break: break-all;">
                        <a href="${signUrl}" style="color: #4F46E5; text-decoration: none; font-size: 14px;">
                          ${signUrl}
                        </a>
                      </p>
                      
                      <p style="margin: 20px 0; color: #666666; font-size: 14px; line-height: 1.6;">
                        <em>Ce lien est à usage unique et expire dans 7 jours.</em>
                      </p>
                    </td>
                  </tr>
                  
                  <!-- Footer -->
                  <tr>
                    <td style="padding: 20px 40px 40px; text-align: center; border-top: 1px solid #e9ecef;">
                      <p style="margin: 0; color: #666666; font-size: 12px; line-height: 1.6;">
                        Cordialement,<br>L'équipe Màndarga
                      </p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
        </html>
      `,
    });
  }

  async sendDocumentSigned(
    email: string,
    documentName: string,
    downloadUrl: string,
  ): Promise<void> {
    await this.sendEmail({
      to: email,
      subject: `Document signé : ${documentName}`,
      html: `
        <!DOCTYPE html>
        <html lang="fr">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Document signé</title>
        </head>
        <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
          <table role="presentation" style="width: 100%; border-collapse: collapse;">
            <tr>
              <td align="center" style="padding: 40px 0;">
                <table role="presentation" style="width: 600px; border-collapse: collapse; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                  <!-- Header -->
                  <tr>
                    <td style="padding: 40px 40px 0; text-align: center;">
                      <h1 style="margin: 0; color: #10B981; font-size: 28px; font-weight: bold;">
                        ✅ Document signé avec succès
                      </h1>
                    </td>
                  </tr>
                  
                  <!-- Body -->
                  <tr>
                    <td style="padding: 40px;">
                      <p style="margin: 0 0 20px 0; color: #333333; font-size: 16px; line-height: 1.6;">
                        Bonjour,
                      </p>
                      
                      <p style="margin: 0 0 20px 0; color: #333333; font-size: 16px; line-height: 1.6;">
                        Le document <strong>${documentName}</strong> a été entièrement signé sur notre plateforme de signature électronique <strong>Màndarga</strong>.
                      </p>
                      
                      <table role="presentation" style="margin: 30px 0; width: 100%;">
                        <tr>
                          <td align="center">
                            <a href="${downloadUrl}" 
                               style="display: inline-block; padding: 16px 40px; background-color: #10B981; color: #ffffff; text-decoration: none; border-radius: 6px; font-size: 16px; font-weight: bold;">
                              Télécharger le document
                            </a>
                          </td>
                        </tr>
                      </table>
                      
                      <p style="margin: 20px 0; color: #666666; font-size: 14px; line-height: 1.6;">
                        Si le bouton ne fonctionne pas, copiez et collez ce lien dans votre navigateur :
                      </p>
                      
                      <p style="margin: 0 0 20px 0; padding: 15px; background-color: #f8f9fa; border-radius: 4px; word-break: break-all;">
                        <a href="${downloadUrl}" style="color: #10B981; text-decoration: none; font-size: 14px;">
                          ${downloadUrl}
                        </a>
                      </p>
                    </td>
                  </tr>
                  
                  <!-- Footer -->
                  <tr>
                    <td style="padding: 20px 40px 40px; text-align: center; border-top: 1px solid #e9ecef;">
                      <p style="margin: 0; color: #666666; font-size: 12px; line-height: 1.6;">
                        Cordialement,<br>L'équipe Màndarga
                      </p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
        </html>
      `,
    });
  }
}
