import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { UploadWizardModal } from "@/components/UploadWizardModal";
import { useAuth } from "@/lib/auth";

export default function Upload() {
  const [, setLocation] = useLocation();
  const { data: user } = useAuth();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [preselectedContestId, setPreselectedContestId] = useState<string | undefined>();

  // Redirect if not authenticated
  if (!user) {
    setLocation("/login");
    return null;
  }

  // Get contest ID from URL and open modal
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const contestId = urlParams.get('contestId');
    setPreselectedContestId(contestId || undefined);
    setIsModalOpen(true);
  }, []);

  // Handle modal close - redirect back to contests
  const handleClose = () => {
    setIsModalOpen(false);
    setLocation("/contests");
  };

  return (
    <div className="min-h-screen pb-32 md:pb-0">
      <UploadWizardModal
        isOpen={isModalOpen}
        onClose={handleClose}
        preselectedContestId={preselectedContestId}
      />
    </div>
  );
}
