import React, { useState } from "react";
import {
  X,
  Heart,
  Share2,
  ShoppingCart,
  User,
  Trophy,
  Eye,
  Star,
} from "lucide-react";

interface ContestLightboxModalProps {
  isOpen: boolean;
  onClose: () => void;
  submission: {
    id: number;
    image: string;
    artist: string;
    votes: number;
    title?: string;
    description?: string;
    rank?: number;
  };
  onVote: (submissionId: number) => void;
  isVoted: boolean;
}

export function ContestLightboxModal({
  isOpen,
  onClose,
  submission,
  onVote,
  isVoted,
}: ContestLightboxModalProps) {
  const [showShareMenu, setShowShareMenu] = useState(false);
  const [isAddedToCart, setIsAddedToCart] = useState(false);

  if (!isOpen) return null;

  // Handle mobile back button
  React.useEffect(() => {
    if (isOpen) {
      const handlePopState = (event: PopStateEvent) => {
        event.preventDefault();
        onClose();
        window.history.pushState(null, "", window.location.href);
      };

      window.history.pushState(null, "", window.location.href);
      window.addEventListener("popstate", handlePopState);

      return () => {
        window.removeEventListener("popstate", handlePopState);
      };
    }
  }, [isOpen, onClose]);

  const handleVote = (e: React.MouseEvent) => {
    e.stopPropagation();
    onVote(submission.id);
  };

  const handleShare = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowShareMenu(!showShareMenu);
  };

  const handleAddToCart = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsAddedToCart(!isAddedToCart);
    // Here you would typically add the item to a cart context or state
    console.log("Added to cart:", submission);
  };

  const shareOptions = [
    {
      name: "Twitter",
      icon: "🐦",
      action: () =>
        window.open(
          `https://twitter.com/intent/tweet?text=Check out this amazing contest submission by ${submission.artist}!`,
        ),
    },
    {
      name: "Facebook",
      icon: "📘",
      action: () =>
        window.open(
          `https://facebook.com/sharer/sharer.php?u=${window.location.href}`,
        ),
    },
    {
      name: "Copy Link",
      icon: "🔗",
      action: () => {
        navigator.clipboard.writeText(window.location.href);
        alert("Link copied to clipboard!");
      },
    },
  ];

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-[60] flex items-center justify-center p-4 overflow-y-auto">
      <div className="relative max-w-7xl w-full max-h-[95vh] my-4 flex flex-col">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 p-3 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors backdrop-blur-sm"
        >
          <X size={24} />
        </button>

        {/* Main Content */}
        <div className="flex flex-col lg:flex-row flex-1 min-h-0 bg-white dark:bg-gray-900 rounded-2xl overflow-hidden shadow-2xl">
          {/* Image Section - Full Size */}
          <div className="lg:flex-1 relative min-h-[400px] lg:min-h-[600px] flex items-center justify-center bg-black">
            <img
              src={submission.image}
              alt={`Contest submission by ${submission.artist}`}
              className="max-w-full max-h-full object-contain"
            />

            {/* Rank Badge */}
            {submission.rank && (
              <div className="absolute top-4 left-4 bg-primary/90 text-white px-4 py-2 rounded-full font-bold text-lg backdrop-blur-sm">
                #{submission.rank}
              </div>
            )}
          </div>

          {/* Action Panel */}
          <div className="lg:w-80 p-6 flex flex-col bg-white dark:bg-gray-900 border-l border-gray-200 dark:border-gray-800">
            <div className="flex-1 space-y-6">
              {/* Title and Artist */}
              <div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                  {submission.title || "Contest Submission"}
                </h2>
                <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400 mb-4">
                  <User size={16} />
                  <span>by {submission.artist}</span>
                </div>
              </div>

              {/* Stats */}
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2">
                  <Heart
                    size={16}
                    className={
                      isVoted ? "fill-current text-red-500" : "text-gray-400"
                    }
                  />
                  <span className="font-medium">{submission.votes} votes</span>
                </div>
                <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                  <Eye size={16} />
                  <span>Contest Entry</span>
                </div>
              </div>

              {/* Description */}
              {submission.description && (
                <div>
                  <h3 className="font-bold text-gray-900 dark:text-white mb-2">
                    Description
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400 text-sm">
                    {submission.description}
                  </p>
                </div>
              )}

              {/* Contest Info */}
              <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-primary/5 dark:bg-primary/10">
                <div className="flex items-center gap-2 mb-2">
                  <Trophy className="text-primary" size={16} />
                  <h3 className="font-bold text-gray-900 dark:text-white">
                    Contest Entry
                  </h3>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  This artwork is participating in the Cyberpunk Cityscapes
                  contest. Vote to support the artist!
                </p>
              </div>

              {/* Action Buttons */}
              <div className="space-y-3">
                {/* Vote Button */}
                <button
                  onClick={handleVote}
                  className={`w-full flex items-center justify-center gap-2 py-4 rounded-lg font-bold transition-all duration-300 text-lg ${
                    isVoted
                      ? "bg-red-500 text-white hover:bg-red-600 shadow-lg shadow-red-500/30"
                      : "bg-primary text-white hover:bg-primary/90 hover:glow shadow-lg shadow-primary/30"
                  }`}
                >
                  <Heart size={20} className={isVoted ? "fill-current" : ""} />
                  {isVoted ? "Voted!" : "Vote for this artwork"}
                </button>

                {/* Share Button */}
                <div className="relative">
                  <button
                    onClick={handleShare}
                    className="w-full flex items-center justify-center gap-2 py-3 rounded-lg bg-blue-500/20 text-blue-500 hover:bg-blue-500/30 transition-colors font-bold"
                  >
                    <Share2 size={18} />
                    Share Submission
                  </button>

                  {/* Share Menu */}
                  {showShareMenu && (
                    <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-2 z-50">
                      {shareOptions.map((option) => (
                        <button
                          key={option.name}
                          onClick={(e) => {
                            e.stopPropagation();
                            option.action();
                            setShowShareMenu(false);
                          }}
                          className="w-full px-4 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2 text-sm"
                        >
                          <span>{option.icon}</span>
                          {option.name}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Add to Cart Button */}
                <button
                  onClick={handleAddToCart}
                  className={`w-full flex items-center justify-center gap-2 py-3 rounded-lg font-bold transition-all duration-300 ${
                    isAddedToCart
                      ? "bg-green-500 text-white hover:bg-green-600"
                      : "bg-orange-500/20 text-orange-500 hover:bg-orange-500/30"
                  }`}
                >
                  <ShoppingCart size={18} />
                  {isAddedToCart ? "Added to Cart!" : "Add to Cart"}
                </button>

                {/* View Artist Profile */}
                <button className="w-full flex items-center justify-center gap-2 py-3 rounded-lg border border-gray-200 dark:border-gray-800 text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors font-bold">
                  <User size={18} />
                  View Artist Profile
                </button>
              </div>

              {/* Rating Section */}
              <div className="pt-4 border-t border-gray-200 dark:border-gray-800">
                <h4 className="font-bold text-gray-900 dark:text-white mb-3">
                  Rate this artwork
                </h4>
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      className="p-1 hover:scale-110 transition-transform"
                    >
                      <Star className="w-6 h-6 text-gray-300 hover:text-yellow-400 hover:fill-current transition-colors" />
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
