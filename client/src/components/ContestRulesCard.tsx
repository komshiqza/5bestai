import React from "react";
import { FileText, CheckCircle, AlertCircle, Trophy } from "lucide-react";

interface ContestRulesCardProps {
  contestTitle?: string;
  onClose?: () => void;
  isModal?: boolean;
}

export function ContestRulesCard({
  contestTitle = "Cyberpunk Cityscapes Contest",
  onClose,
  isModal = false,
}: ContestRulesCardProps) {
  const rules = [
    {
      icon: CheckCircle,
      title: "Original AI Art Only",
      description:
        "All submissions must be original AI-generated artwork created by you.",
      type: "requirement",
    },
    {
      icon: CheckCircle,
      title: "High Resolution",
      description:
        "Minimum resolution of 2048x2048 pixels required for all submissions.",
      type: "requirement",
    },
    {
      icon: CheckCircle,
      title: "Maximum 3 Submissions",
      description: "Each participant can submit up to 3 artworks per contest.",
      type: "requirement",
    },
    {
      icon: AlertCircle,
      title: "No Copyrighted Content",
      description:
        "Do not use copyrighted characters, logos, or trademarked content.",
      type: "warning",
    },
    {
      icon: AlertCircle,
      title: "Appropriate Content",
      description: "No NSFW, violent, or offensive content will be accepted.",
      type: "warning",
    },
    {
      icon: Trophy,
      title: "Voting Period",
      description:
        "Public voting will be open for 48 hours after submission deadline.",
      type: "info",
    },
  ];

  const getIconColor = (type: string) => {
    switch (type) {
      case "requirement":
        return "text-green-500";
      case "warning":
        return "text-yellow-500";
      case "info":
        return "text-primary";
      default:
        return "text-gray-500";
    }
  };

  const cardContent = (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <div className="flex items-center justify-center mb-4">
          <div className="p-3 rounded-full bg-primary/10">
            <FileText className="text-primary" size={32} />
          </div>
        </div>
        <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white tracking-tight">
          Contest Rules
        </h2>
        <p className="mt-2 text-lg text-gray-500 dark:text-gray-400">
          "{contestTitle}"
        </p>
      </div>

      {/* Rules List */}
      <div className="space-y-4">
        {rules.map((rule, index) => {
          const IconComponent = rule.icon;
          return (
            <div
              key={index}
              className="flex items-start gap-4 p-4 rounded-xl bg-background-light dark:bg-gray-900/40 border border-gray-200 dark:border-gray-800 transition-all duration-300 hover:shadow-lg hover:shadow-primary/10"
            >
              <div className={`flex-shrink-0 mt-1 ${getIconColor(rule.type)}`}>
                <IconComponent size={20} />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">
                  {rule.title}
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {rule.description}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Prize Distribution */}
      <div className="border-t border-gray-200 dark:border-gray-800 pt-6">
        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4 text-center">
          Prize Distribution
        </h3>
        <div className="grid grid-cols-3 gap-3 text-center">
          <div className="p-3 rounded-lg bg-gradient-to-br from-yellow-400/10 to-yellow-600/10 border border-yellow-400/20">
            <div className="w-8 h-8 rounded-full bg-gradient-to-r from-yellow-400 to-yellow-600 flex items-center justify-center mx-auto mb-2">
              <span className="text-sm font-bold text-black">1st</span>
            </div>
            <p className="text-lg font-bold text-gray-900 dark:text-white">
              50%
            </p>
            <p className="text-xs text-yellow-600 dark:text-yellow-400 font-medium">
              5,000 $GLORY
            </p>
          </div>
          <div className="p-3 rounded-lg bg-gradient-to-br from-gray-300/10 to-gray-500/10 border border-gray-400/20">
            <div className="w-8 h-8 rounded-full bg-gradient-to-r from-gray-300 to-gray-500 flex items-center justify-center mx-auto mb-2">
              <span className="text-sm font-bold text-black">2nd</span>
            </div>
            <p className="text-lg font-bold text-gray-900 dark:text-white">
              30%
            </p>
            <p className="text-xs text-gray-600 dark:text-gray-400 font-medium">
              3,000 $GLORY
            </p>
          </div>
          <div className="p-3 rounded-lg bg-gradient-to-br from-orange-400/10 to-orange-600/10 border border-orange-400/20">
            <div className="w-8 h-8 rounded-full bg-gradient-to-r from-orange-400 to-orange-600 flex items-center justify-center mx-auto mb-2">
              <span className="text-sm font-bold text-black">3rd</span>
            </div>
            <p className="text-lg font-bold text-gray-900 dark:text-white">
              20%
            </p>
            <p className="text-xs text-orange-600 dark:text-orange-400 font-medium">
              2,000 $GLORY
            </p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="text-center pt-4 border-t border-gray-200 dark:border-gray-800">
        <p className="text-sm text-gray-600 dark:text-gray-400">
          By participating, you agree to these rules and terms.
        </p>
        <p className="text-xs text-gray-500 dark:text-gray-500 mt-2">
          Contest runs until the timer expires. Good luck! 🎨
        </p>
      </div>
    </div>
  );

  if (isModal) {
    return (
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
        <div className="bg-background-light dark:bg-background-dark rounded-2xl max-w-2xl w-full max-h-[95vh] my-4 shadow-2xl">
          {/* Modal Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-800">
            <div className="flex items-center gap-3">
              <svg
                className="h-8 w-8 text-primary"
                fill="none"
                viewBox="0 0 48 48"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M4 4H17.3334V17.3334H30.6666V30.6666H44V44H4V4Z"
                  fill="currentColor"
                ></path>
              </svg>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                PromptGlory
              </h1>
            </div>
            {onClose && (
              <button
                onClick={onClose}
                className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors"
              >
                <svg
                  className="h-5 w-5 text-gray-500 dark:text-gray-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            )}
          </div>

          {/* Modal Content */}
          <div className="p-6 overflow-y-auto max-h-[calc(95vh-80px)]">
            {cardContent}
          </div>
        </div>
      </div>
    );
  }

  return <div className="max-w-2xl mx-auto p-6">{cardContent}</div>;
}
