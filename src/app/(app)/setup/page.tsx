import SetupWizard from "./_components/SetupWizard";

export default function SetupPage() {
  return (
    <div className="skeu-page">
      <div className="max-w-4xl mx-auto px-4 py-6 space-y-4">
        <div className="mb-2">
          <h1 className="text-xl font-semibold text-text-primary">Profile setup</h1>
          <p className="text-sm text-text-muted mt-1">
            Save your resumes, GitHub and preferences once. Drafts, outreach and
            Claude Code applications all use this, and only approved facts are
            ever quoted.
          </p>
        </div>
        <SetupWizard />
      </div>
    </div>
  );
}
