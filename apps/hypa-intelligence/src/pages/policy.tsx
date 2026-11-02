/* eslint-disable */
// @ts-nocheck
import MainFooter from "@/components/shared/main-footer";
import {
  Shield,
  Database,
  Lock,
  Eye,
  Users,
  Globe,
  FileText,
  Mail,
} from "lucide-react";
import chatPrivacy from "@hypa/config/json/chat-privacy.json";

const Policy = () => {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <main className="flex-1 container mx-auto px-4 md:px-6 max-w-4xl py-8 md:py-12 space-y-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <Shield className="size-8 text-primary" />
            <h1 className="text-3xl lg:text-4xl xl:text-5xl font-bold text-foreground">
              Privacy Policy
            </h1>
          </div>
          <p className="text-muted-foreground text-sm">
            Last updated:{" "}
            {new Date().toLocaleDateString("en-US", {
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </p>
        </div>

        {/* Content */}
        <div className="space-y-8">
          {/* Introduction */}
          <section className="prose prose-slate dark:prose-invert max-w-none">
            <p className="text-foreground leading-relaxed">
              Welcome to Hypa Translate ("we," "our," or "us"). We are committed
              to protecting your privacy and ensuring transparency about how we
              collect, use, and safeguard your information. This Privacy Policy
              explains our practices regarding the data we collect when you use
              our translation service.
            </p>
          </section>

          {/* Information We Collect */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <Database className="size-5 text-primary" />
              <h2 className="text-2xl font-bold text-foreground">
                Information We Collect
              </h2>
            </div>
            <div className="space-y-4 text-foreground">
              <div>
                <h3 className="text-lg font-semibold mb-2">Translation Data</h3>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground ml-4">
                  <li>
                    Text content you translate, including source and target
                    languages
                  </li>
                  <li>
                    Documents, images, and website content you upload for
                    translation
                  </li>
                  <li>Audio recordings you provide for voice translation</li>
                  <li>Translation history and bookmarked translations</li>
                  <li>User feedback on translation quality (thumbs up/down)</li>
                </ul>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-2">{chatPrivacy.title}</h3>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground ml-4">
                  {chatPrivacy.points.map((point) => (
                    <li key={point}>{point}</li>
                  ))}
                </ul>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-2">
                  Account Information
                </h3>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground ml-4">
                  <li>
                    If you create an account: email address, display name, and
                    profile information
                  </li>
                  <li>
                    Authentication data when you sign in with Google or
                    email/password
                  </li>
                  <li>Account preferences and settings</li>
                </ul>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-2">
                  Technical Information
                </h3>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground ml-4">
                  <li>Browser type, version, and device information</li>
                  <li>IP address and general location data</li>
                  <li>Usage patterns and feature interactions</li>
                  <li>Error logs and performance metrics</li>
                </ul>
              </div>
            </div>
          </section>

          {/* How We Use Your Information */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <Eye className="size-5 text-primary" />
              <h2 className="text-2xl font-bold text-foreground">
                How We Use Your Information
              </h2>
            </div>
            <div className="space-y-3 text-muted-foreground">
              <ul className="list-disc list-inside space-y-1 ml-4">
                <li>
                  To provide translation services across multiple input modes
                  (text, document, voice, image, website)
                </li>
                <li>
                  To process speech-to-text and text-to-speech conversions
                </li>
                <li>
                  To store and sync your translation history across devices
                </li>
                <li>To save your bookmarked translations and preferences</li>
                <li>To improve translation quality and service performance</li>
                <li>To authenticate your account and maintain your session</li>
                <li>
                  To respond to your inquiries and provide customer support
                </li>
                <li>To detect and prevent fraud, abuse, or security issues</li>
              </ul>
            </div>
          </section>

          {/* Data Storage */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <Database className="size-5 text-primary" />
              <h2 className="text-2xl font-bold text-foreground">
                Data Storage
              </h2>
            </div>
            <div className="space-y-3 text-muted-foreground">
              <p>
                Your translation data is stored in two locations to provide a
                seamless experience:
              </p>
              <ul className="list-disc list-inside space-y-1 ml-4">
                <li>
                  <strong className="text-foreground">Local Storage:</strong>{" "}
                  Data is stored locally on your device using IndexedDB (via
                  Dexie) for offline access and fast performance.
                </li>
                <li>
                  <strong className="text-foreground">Cloud Storage:</strong>{" "}
                  When you have an account, your data is synced to Firebase
                  Firestore for cross-device access and backup.
                </li>
              </ul>
              <p>
                You can manage your data through the Settings page, including
                exporting or deleting your translation history.
              </p>
            </div>
          </section>

          {/* Third-Party Services */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <Globe className="size-5 text-primary" />
              <h2 className="text-2xl font-bold text-foreground">
                Third-Party Services
              </h2>
            </div>
            <div className="space-y-3 text-muted-foreground">
              <p>
                We use the following third-party services to provide our
                translation features:
              </p>
              <ul className="list-disc list-inside space-y-1 ml-4">
                <li>
                  <strong className="text-foreground">
                    Firebase (Google):
                  </strong>{" "}
                  Used for authentication, cloud storage, and data
                  synchronization. Firebase's privacy practices are governed by{" "}
                  <a
                    className="text-primary hover:underline"
                    href="https://policies.google.com/privacy"
                    rel="noopener noreferrer"
                    target="_blank"
                  >
                    Google's Privacy Policy
                  </a>
                  .
                </li>
              </ul>
              <p>
                We do not sell your personal information to third parties. We
                only share data with service providers necessary to deliver our
                translation services.
              </p>
            </div>
          </section>

          {/* Your Rights */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <Users className="size-5 text-primary" />
              <h2 className="text-2xl font-bold text-foreground">
                Your Rights and Choices
              </h2>
            </div>
            <div className="space-y-3 text-muted-foreground">
              <p>You have the following rights regarding your data:</p>
              <ul className="list-disc list-inside space-y-1 ml-4">
                <li>
                  <strong className="text-foreground">Access:</strong> View your
                  translation history and account data through the app interface
                </li>
                <li>
                  <strong className="text-foreground">Export:</strong> Download
                  your translation data in a portable format via Settings
                </li>
                <li>
                  <strong className="text-foreground">Opt-Out:</strong> Use the
                  service without creating an account (data will only be stored
                  locally)
                </li>
              </ul>
            </div>
          </section>

          {/* Data Security */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <Lock className="size-5 text-primary" />
              <h2 className="text-2xl font-bold text-foreground">
                Data Security
              </h2>
            </div>
            <div className="space-y-3 text-muted-foreground">
              <p>
                We implement industry-standard security measures to protect your
                data:
              </p>
              <ul className="list-disc list-inside space-y-1 ml-4">
                <li>Encrypted data transmission using HTTPS/TLS</li>
                <li>Secure authentication through Firebase Auth</li>
                <li>Access controls and security rules in Firestore</li>
                <li>Regular security assessments and updates</li>
              </ul>
              <p>
                However, no method of transmission over the internet or
                electronic storage is 100% secure. While we strive to protect
                your data, we cannot guarantee absolute security.
              </p>
            </div>
          </section>

          {/* Usage Analytics */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <FileText className="size-5 text-primary" />
              <h2 className="text-2xl font-bold text-foreground">
                Usage Analytics
              </h2>
            </div>
            <div className="space-y-3 text-muted-foreground">
              <p>
                We use PostHog, an analytics provider, to understand how Hypa is
                used so we can improve it. On our website, mobile apps and
                browser extension we record:
              </p>
              <ul className="list-disc list-inside space-y-1 ml-4">
                <li>
                  Which features you use, whether a request succeeded, how long
                  it took and what it cost
                </li>
                <li>Which languages and models were involved</li>
                <li>
                  When you open the app, and which action you take on a result,
                  such as copying or playing it
                </li>
              </ul>
              <p>
                We do not record what you type, say, upload or receive: no text,
                audio, images or translations. We do not send your email
                address, name or sign-in token to our analytics tool.
              </p>
              <p>
                When you are signed in, this activity is linked to an internal
                account id, not your name or email. When you are signed out, it
                is linked to a random identifier created on your device, which
                is kept in your browser's local storage and a cookie, or in the
                app's storage on mobile. We do not store your IP address with
                these events. PostHog processes this data on our behalf on
                servers in the United States, and we keep it for 12 months. You
                can ask us to delete your usage data at any time using the
                contact details below.
              </p>
            </div>
          </section>

          {/* Cookies and Local Storage */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <FileText className="size-5 text-primary" />
              <h2 className="text-2xl font-bold text-foreground">
                Cookies and Local Storage
              </h2>
            </div>
            <div className="space-y-3 text-muted-foreground">
              <p>We use browser local storage and IndexedDB to:</p>
              <ul className="list-disc list-inside space-y-1 ml-4">
                <li>
                  Store your translation history locally for offline access
                </li>
                <li>Save your preferences and settings</li>
                <li>Maintain your session and authentication state</li>
                <li>Improve app performance and loading times</li>
              </ul>
              <p>
                You can clear this data at any time through your browser
                settings or the app's data management features.
              </p>
            </div>
          </section>

          {/* Changes to This Policy */}
          <section>
            <h2 className="text-2xl font-bold text-foreground mb-4">
              Changes to This Privacy Policy
            </h2>
            <p className="text-muted-foreground">
              We may update this Privacy Policy from time to time. We will
              notify you of any material changes by updating the "Last updated"
              date at the top of this page. Your continued use of the service
              after changes constitutes acceptance of the updated policy.
            </p>
          </section>

          {/* Contact Us */}
          <section className="border-t pt-6">
            <div className="flex items-center gap-2 mb-4">
              <Mail className="size-5 text-primary" />
              <h2 className="text-2xl font-bold text-foreground">Contact Us</h2>
            </div>
            <p className="text-muted-foreground">
              If you have questions about this Privacy Policy or our data
              practices, please contact us at:
            </p>
            <div className="mt-4 p-4 bg-muted/50 rounded-lg">
              <p className="text-foreground font-medium">Email:</p>
              <a
                className="text-primary hover:underline"
                href="mailto:hypa.ai.ng@gmail.com"
              >
                hypa.ai.ng@gmail.com
              </a>
            </div>
          </section>
        </div>
      </main>

      <MainFooter />
    </div>
  );
};

export default Policy;
