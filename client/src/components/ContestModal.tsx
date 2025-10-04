import React, { useState } from "react";
import {
  X,
  Calendar,
  Trophy,
  Users,
  Upload,
  Heart,
  Share2,
  Expand,
} from "lucide-react";
import { SubmissionDetailModal } from "./SubmissionDetailModal";
import { UploadCard } from "./UploadCard";

interface ContestModalProps {
  isOpen: boolean;
  onClose: () => void;
  contest: {
    id: number;
    title: string;
    description: string;
    prizePool: string;
    timeLeft: string;
    image: string;
  };
}

export function ContestModal({ isOpen, onClose, contest }: ContestModalProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const [votedSubmissions, setVotedSubmissions] = useState<Set<number>>(
    new Set(),
  );
  const [selectedSubmission, setSelectedSubmission] = useState<any>(null);
  const [isSubmissionModalOpen, setIsSubmissionModalOpen] = useState(false);
  const [showUploadCard, setShowUploadCard] = useState(false);

  const submissions = [
    {
      id: 1,
      image:
        "https://lh3.googleusercontent.com/aida-public/AB6AXuCuMdBkUAgmlGWj0_S6NmA-szfbPpar65bm3_es7NTurJWrcv6od1mySiZEF7FhnMOzlh2hZwA_NYTmgzZTWjFq_ujbE_vYLvXm_6BmrboXyw31lYeA_ooqZZWu1zZjXIDGkK0NaW9xvw-RgYHp2b_5D-TXLVyvl58uioFxkPHyWvrcg7RX33Bq93ifxeHk8Nr3I2b1thy36HWGm6ZzJLFRaG9oDYZA4dLqVjA0cckS0S8cNDopYGfH3wtyls3PDeJxotdEz5eOdB4",
      artist: "CyberArtist_01",
      votes: 234,
      title: "Neon Metropolis",
      description:
        "A sprawling cyberpunk cityscape with towering neon-lit skyscrapers and flying vehicles navigating through the urban maze.",
    },
    {
      id: 2,
      image:
        "https://lh3.googleusercontent.com/aida-public/AB6AXuCC2m-OkVnrEUXBWs8ahYkN9L06ua4mMOWNjqIgTimBa59P_1KPRue0BH3lotglBYmhZMSNdkFmRoFNVYYUgKzlp_EcK7o0VSBYV314gMVvD1vOZXRyhhTqPBe2U2Ikbkoh6EXsP3hlZQpvPTGgA70FvejTd2dQXR2qERjULhJlL_YUVmVQrS8kHs8Yl4Kk5_ARXqJfZxDcoPmy0pIPIzTe6oK5uRqy4VKW2bW0rBxvwKQ01vy2n69UxJ8Xd_RErfTiBog2dptsMe4",
      artist: "NeonDreamer",
      votes: 189,
      title: "Digital Rain",
      description:
        "Inspired by classic cyberpunk aesthetics, this piece captures the essence of a digital world where reality and virtuality merge.",
    },
    {
      id: 3,
      image:
        "https://lh3.googleusercontent.com/aida-public/AB6AXuAsQ2Tt0aCawfBZODrs9zSaEAYJp1ft95rnQ7V6O7FUQ7abqMeLy0c6qwucCuiBl87jVlYU-2LD3vbUo6TrufJcol4xFtooN_FK44Af1wGU1Nkhbrp72KdA4N4XCiEgY1L_xb_HSl66O4bjJHfGKvSnNu1USSLEgBgzkNz0zsrng9zJYok7jQ64_WcoJPV2GjU8mjzluA3_uoZjwbERciZvfj7S8rpTaEPbHY8a31h69pWp1rbEFP51Y2eK94F9uoRNfhsRrZ7-pbk",
      artist: "FutureVision",
      votes: 156,
      title: "Chrome Horizon",
      description:
        "A futuristic cityscape where chrome and glass structures reach toward an artificial sky, embodying the cyberpunk dream.",
    },
    {
      id: 4,
      image:
        "https://lh3.googleusercontent.com/aida-public/AB6AXuB327VpoL2y_cTzMMFmjw3FknDDXzT2m4-tHt7QIRNeOr-GlQv1QeKF3mZl_8N6furFSog94qSiQu4X-k568zKhuJxTXUu5W6P7xyg5AvlchiUq9lVH8jVXtXBspItMLkUzmwoe-ow_n-oBha-wrZro0xNN1YgRN0sAJubP22a5FWfawJrZvbdFlpKRa-Z6BGQ_gu5XWnz8cSAAmmQn1XD3g45ko7YspVGAhsiabeENUlwgy-BxZFkOIdqWcT3UCWO85zUmecsz5Ec",
      artist: "DigitalPunk",
      votes: 298,
      title: "Electric Dreams",
      description:
        "Vibrant electric colors illuminate this cyberpunk vision, where technology and humanity coexist in a neon-soaked urban landscape.",
    },
    {
      id: 5,
      image:
        "https://lh3.googleusercontent.com/aida-public/AB6AXuDPEdbdZtTMy6M-oJHvJSaviMziFeDCOVK46ffLwawoIBMMB2B5eQ_Ppy_28hN2uRrT4LCx43DaUDtzct22Vox8R9WFtouQyxtllVZUUVs7YckWeDqf14DqFCcfbQJhIDmiv6i9zQdK2Ee9Xxje2vRFbYP7nEaK06IYGQ1nAGhTIX2UfM0xQJ9l9yNwWdNTSlQeM_8rxvVUTxRywO2HQ0iu1dqqXZcao_BeUNf1eyKUydI5xO0Z3Ef-4Spzr4-kBDfYb_JVDenpoFI",
      artist: "MetroMind",
      votes: 167,
      title: "Urban Synthesis",
      description:
        "A synthesis of organic and synthetic elements creates this unique cyberpunk cityscape, blending nature with high-tech architecture.",
    },
    {
      id: 6,
      image:
        "https://lh3.googleusercontent.com/aida-public/AB6AXuB6LAuZTz0K8X-y8tdsB8ojZaqlGDbX8lHRUBcl8NmSod_JIye0JuHRzlcshUBbbfEc1soVi55t03ea6BabgDELQ4qwY9vJr8yd5UJ9hnXqZ-FsZrWIx1PNObo4WTWNosjSqk-fzS51CfKUS8HWUzdS6vvb3syozJAyopcQ5ZBU_b2nEw8Z6fJUIuGjTXoGofz3aTbwwe4XeoIqHdLzqIwpHbd9pqGjK8zFjqlnDWllxCFp6sbjDo1B-dFecPEvUDtaWEAtowYNLfY",
      artist: "TechnoScape",
      votes: 203,
      title: "Data Stream City",
      description:
        "Information flows like rivers through this digital metropolis, where data streams create the very fabric of the urban environment.",
    },
  ];

  const handleVote = (submissionId: number) => {
    setVotedSubmissions((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(submissionId)) {
        newSet.delete(submissionId);
      } else {
        newSet.add(submissionId);
      }
      return newSet;
    });
  };

  const handleSubmissionClick = (submission: any) => {
    setSelectedSubmission(submission);
    setIsSubmissionModalOpen(true);
  };

  const handleCloseSubmissionModal = () => {
    setIsSubmissionModalOpen(false);
    setSelectedSubmission(null);
  };

  const handleShowUpload = () => {
    setShowUploadCard(true);
  };

  const handleCloseUpload = () => {
    setShowUploadCard(false);
  };

  const handleSubmitArtwork = async (data: any) => {
    console.log("Submitting artwork:", data);
    // Here you would typically send the data to your backend
    // For now, we'll just log it and close the modal
    setShowUploadCard(false);
  };
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-background-light dark:bg-background-dark rounded-2xl max-w-7xl w-full max-h-[95vh] my-4 shadow-2xl flex flex-col">
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-primary/20 bg-background-light/80 dark:bg-background-dark/80 backdrop-blur-sm px-6 py-4">
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
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              <span className="bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">
                PromptGlory
              </span>
            </h1>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full bg-gray-200 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-300 dark:hover:bg-gray-700 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="px-6 py-8">
            <div className="grid grid-cols-1 gap-12 lg:grid-cols-3">
              {/* Sidebar */}
              <div className="space-y-8 lg:col-span-1">
                {/* Contest Details */}
                <div className="rounded-lg border border-primary/20 dark:border-primary/30 bg-background-light dark:bg-gray-900/40 p-6">
                  <h3 className="mb-4 text-xl font-bold text-gray-900 dark:text-white">
                    Contest Details
                  </h3>
                  <dl className="space-y-4">
                    <div className="flex flex-col">
                      <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
                        Theme
                      </dt>
                      <dd className="mt-1 text-base text-gray-800 dark:text-gray-300">
                        {contest.title}
                      </dd>
                    </div>
                    <div className="flex flex-col">
                      <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
                        Dates
                      </dt>
                      <dd className="mt-1 text-base text-gray-800 dark:text-gray-300">
                        July 15 - August 15, 2024
                      </dd>
                    </div>
                    <div className="flex flex-col">
                      <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
                        Prize Pool
                      </dt>
                      <dd className="mt-1 text-lg font-bold text-primary flex items-center gap-2">
                        <Trophy size={20} />
                        {contest.prizePool}
                      </dd>
                    </div>
                    <div className="flex flex-col">
                      <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
                        Time Left
                      </dt>
                      <dd className="mt-1 text-lg font-bold text-primary flex items-center gap-2">
                        <Calendar size={20} />
                        {contest.timeLeft}
                      </dd>
                    </div>
                  </dl>
                </div>

                {/* Description */}
                <div className="rounded-lg border border-primary/20 dark:border-primary/30 bg-background-light dark:bg-gray-900/40 p-6">
                  <h3 className="mb-4 text-xl font-bold text-gray-900 dark:text-white">
                    Description
                  </h3>
                  <p className="text-base text-gray-600 dark:text-gray-400">
                    Imagine a sprawling metropolis bathed in neon lights,
                    towering skyscrapers piercing the clouds, and flying
                    vehicles zipping through the air. This contest challenges
                    you to create breathtaking cyberpunk cityscapes using AI art
                    tools. Let your imagination run wild and show us your vision
                    of the future!
                  </p>
                </div>

                {/* Rules */}
                <div className="rounded-lg border border-primary/20 dark:border-primary/30 bg-background-light dark:bg-gray-900/40 p-6">
                  <h3 className="mb-4 text-xl font-bold text-gray-900 dark:text-white">
                    Rules
                  </h3>
                  <ul className="space-y-2 text-base text-gray-600 dark:text-gray-400">
                    <li className="flex items-start gap-3">
                      <span className="mt-1 h-2 w-2 flex-shrink-0 rounded-full bg-primary"></span>
                      <span>
                        All submissions must be original AI-generated artwork.
                      </span>
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="mt-1 h-2 w-2 flex-shrink-0 rounded-full bg-primary"></span>
                      <span>
                        Submissions must be in high resolution (min 2048x2048).
                      </span>
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="mt-1 h-2 w-2 flex-shrink-0 rounded-full bg-primary"></span>
                      <span>
                        Each participant can submit a maximum of 3 artworks.
                      </span>
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="mt-1 h-2 w-2 flex-shrink-0 rounded-full bg-primary"></span>
                      <span>Voting will be open to the public.</span>
                    </li>
                  </ul>
                </div>
              </div>

              {/* Gallery */}
              <div className="lg:col-span-2">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    <Users size={24} />
                    Submissions Gallery
                  </h3>
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    {submissions.length} submissions
                  </span>
                </div>

                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  {submissions.map((submission) => (
                    <div
                      key={submission.id}
                      className="group relative overflow-hidden rounded-lg"
                    >
                      <img
                        alt={`Cyberpunk cityscape by ${submission.artist}`}
                        className="h-64 w-full object-cover transition-transform duration-300 group-hover:scale-105"
                        src={submission.image}
                      />

                      {/* Overlay Controls */}
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all duration-300">
                        <div className="absolute top-3 right-3 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                          <button className="p-2 rounded-full bg-black/50 text-white hover:bg-primary/90 backdrop-blur-sm transition-all duration-300">
                            <Share2 size={16} />
                          </button>
                          <button
                            onClick={() => handleSubmissionClick(submission)}
                            className="p-2 rounded-full bg-black/50 text-white hover:bg-primary/90 backdrop-blur-sm transition-all duration-300"
                          >
                            <Expand size={16} />
                          </button>
                        </div>
                      </div>

                      {/* Bottom Info */}
                      <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/60 to-transparent">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-white text-sm font-medium">
                              by {submission.artist}
                            </p>
                            <p className="text-white/80 text-xs">
                              {submission.votes} votes
                            </p>
                          </div>
                          <button
                            onClick={() => handleVote(submission.id)}
                            className={`flex items-center gap-1 rounded-full px-3 py-1 text-xs font-bold backdrop-blur-sm transition-all duration-300 ${
                              votedSubmissions.has(submission.id)
                                ? "bg-red-500/90 text-white"
                                : "bg-primary/80 text-white hover:bg-primary"
                            }`}
                          >
                            <Heart
                              size={14}
                              className={
                                votedSubmissions.has(submission.id)
                                  ? "fill-current"
                                  : ""
                              }
                            />
                            Vote
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Pagination */}
                <div className="mt-8 flex items-center justify-center space-x-2">
                  <button className="flex h-9 w-9 items-center justify-center rounded-full text-gray-500 dark:text-gray-400 transition-colors hover:bg-primary/10 hover:text-primary">
                    <svg
                      fill="currentColor"
                      height="18px"
                      viewBox="0 0 256 256"
                      width="18px"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path d="M165.66,202.34a8,8,0,0,1-11.32,11.32l-80-80a8,8,0,0,1,0-11.32l80-80a8,8,0,0,1,11.32,11.32L91.31,128Z"></path>
                    </svg>
                  </button>

                  {[1, 2, 3].map((page) => (
                    <button
                      key={page}
                      onClick={() => setCurrentPage(page)}
                      className={`flex h-9 w-9 items-center justify-center rounded-full text-sm font-medium transition-colors ${
                        currentPage === page
                          ? "bg-primary text-white"
                          : "text-gray-600 dark:text-gray-400 hover:bg-primary/10 hover:text-primary"
                      }`}
                    >
                      {page}
                    </button>
                  ))}

                  <span className="flex h-9 w-9 items-center justify-center text-sm text-gray-500 dark:text-gray-400">
                    ...
                  </span>
                  <button className="flex h-9 w-9 items-center justify-center rounded-full text-sm font-medium text-gray-600 dark:text-gray-400 transition-colors hover:bg-primary/10 hover:text-primary">
                    10
                  </button>

                  <button className="flex h-9 w-9 items-center justify-center rounded-full text-gray-500 dark:text-gray-400 transition-colors hover:bg-primary/10 hover:text-primary">
                    <svg
                      fill="currentColor"
                      height="18px"
                      viewBox="0 0 256 256"
                      width="18px"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path d="M181.66,133.66l-80,80a8,8,0,0,1-11.32-11.32L164.69,128,90.34,53.66a8,8,0,0,1,11.32-11.32l80,80A8,8,0,0,1,181.66,133.66Z"></path>
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Submission Detail Modal */}
      {selectedSubmission && (
        <SubmissionDetailModal
          isOpen={isSubmissionModalOpen}
          onClose={handleCloseSubmissionModal}
          submission={selectedSubmission}
          onVote={handleVote}
          isVoted={votedSubmissions.has(selectedSubmission.id)}
        />
      )}

      {/* Upload Card Modal */}
      {showUploadCard && (
        <UploadCard
          isModal={true}
          contestTitle={contest.title}
          contestPrize={contest.prizePool}
          onSubmit={handleSubmitArtwork}
          onClose={handleCloseUpload}
        />
      )}
    </div>
  );
}
