import { RuleForm } from "@/components/rule-form";

export default function NewRulePage() {
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">New Rule</h1>
        <p className="text-sm text-gray-500">
          Define conditions to match emails and actions to apply.
        </p>
      </div>
      <RuleForm />
    </div>
  );
}
