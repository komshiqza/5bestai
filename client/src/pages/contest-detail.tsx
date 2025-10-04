import React from "react";
import { useState, useEffect } from "react";
import { Search, FileText, Upload, ChevronDown } from "lucide-react";
import { ContestModal } from "../components/ContestModal";
import { UploadCard } from "../components/UploadCard";
import { ContestLightboxModal } from "../components/ContestLightboxModal";
import { ContestRulesCard } from "../components/ContestRulesCard";
import { ProductCard } from "../components/ProductCard";
import { GlassButton } from "../components/GlassButton";
import { UploadSelectionModal } from "../components/UploadSelectionModal";

interface SingleContestPageProps {
  contest: {
    id: number;
    title: string;
    description: string;
    image: string;
    prizePool: string;
    timeLeft: {
      days: number;
      hours: number;
      minutes: number;
      seconds: number;
    };
    participants: number;
    status: "active" | "upcoming" | "ended";
  };
}

export function SingleContestPage({ contest }: SingleContestPageProps) {
  const [selectedContest, setSelectedContest] = useState<any>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedSubmission, setSelectedSubmission] = useState<any>(null);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [showUploadCard, setShowUploadCard] = useState(false);
  const [showUploadSelection, setShowUploadSelection] = useState(false);
  const [sortBy, setSortBy] = useState("Most Voted");
  const [searchTerm, setSearchTerm] = useState("");
  // Defensive: if contest is missing or malformed, initialize a safe default
  const [timeLeft, setTimeLeft] = useState(
    contest?.timeLeft ?? { days: 0, hours: 0, minutes: 0, seconds: 0 },
  );
  const [showRules, setShowRules] = useState(false);

  // Debug log to trace incoming contest data when page mounts
  React.useEffect(() => {
    console.log("SingleContestPage mounted with contest:", contest);
  }, [contest]);

  // If contest is not provided, render a friendly fallback instead of crashing
  if (!contest) {
    return (
      <div className="flex-1 px-4 py-8 sm:px-6 md:px-10 lg:px-20">
        <div className="mx-auto max-w-screen-xl text-center">
          <h2 className="text-2xl font-bold text-white mb-4">
            Contest not found
          </h2>
          <p className="text-sm text-gray-300">
            The contest details are missing. Please go back to the Contests page
            and try again.
          </p>
        </div>
      </div>
    );
  }

  // Scroll to top when component mounts
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // Countdown timer effect
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        let { days, hours, minutes, seconds } = prev;

        if (seconds > 0) {
          seconds--;
        } else if (minutes > 0) {
          minutes--;
          seconds = 59;
        } else if (hours > 0) {
          hours--;
          minutes = 59;
          seconds = 59;
        } else if (days > 0) {
          days--;
          hours = 23;
          minutes = 59;
          seconds = 59;
        }

        return { days, hours, minutes, seconds };
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const topSubmissions = [
    {
      id: 1,
      rank: 1,
      image:
        "https://lh3.googleusercontent.com/aida-public/AB6AXuCuMdBkUAgmlGWj0_S6NmA-szfbPpar65bm3_es7NTurJWrcv6od1mySiZEF7FhnMOzlh2hZwA_NYTmgzZTWjFq_ujbE_vYLvXm_6BmrboXyw31lYeA_ooqZZWu1zZjXIDGkK0NaW9xvw-RgYHp2b_5D-TXLVyvl58uioFxkPHyWvrcg7RX33Bq93ifxeHk8Nr3I2b1thy36HWGm6ZzJLFRaG9oDYZA4dLqVjA0cckS0S8cNDopYGfH3wtyls3PDeJxotdEz5eOdB4",
      artist: "@CyberArtist",
      votes: 1247,
      title: "Neon Metropolis",
      description:
        "A sprawling cyberpunk cityscape with towering neon-lit skyscrapers and flying vehicles navigating through the urban maze.",
    },
    {
      id: 2,
      rank: 2,
      image:
        "https://lh3.googleusercontent.com/aida-public/AB6AXuCC2m-OkVnrEUXBWs8ahYkN9L06ua4mMOWNjqIgTimBa59P_1KPRue0BH3lotglBYmhZMSNdkFmRoFNVYYUgKzlp_EcK7o0VSBYV314gMVvD1vOZXRyhhTqPBe2U2Ikbkoh6EXsP3hlZQpvPTGgA70FvejTd2dQXR2qERjULhJlL_YUVmVQrS8kHs8Yl4Kk5_ARXqJfZxDcoPmy0pIPIzTe6oK5uRqy4VKW2bW0rBxvwKQ01vy2n69UxJ8Xd_RErfTiBog2dptsMe4",
      artist: "@NeonDreamer",
      votes: 1089,
      title: "Digital Rain",
      description:
        "Inspired by classic cyberpunk aesthetics, this piece captures the essence of a digital world where reality and virtuality merge.",
    },
    {
      id: 3,
      rank: 3,
      image:
        "https://lh3.googleusercontent.com/aida-public/AB6AXuAsQ2Tt0aCawfBZODrs9zSaEAYJp1ft95rnQ7V6O7FUQ7abqMeLy0c6qwucCuiBl87jVlYU-2LD3vbUo6TrufJcol4xFtooN_FK44Af1wGU1Nkhbrp72KdA4N4XCiEgY1L_xb_HSl66O4bjJHfGKvSnNu1USSLEgBgzkNz0zsrng9zJYok7jQ64_WcoJPV2GjU8mjzluA3_uoZjwbERciZvfj7S8rpTaEPbHY8a31h69pWp1rbEFP51Y2eK94F9uoRNfhsRrZ7-pbk",
      artist: "@FutureScapes",
      votes: 892,
      title: "Chrome Horizon",
      description:
        "A futuristic cityscape where chrome and glass structures reach toward an artificial sky, embodying the cyberpunk dream.",
    },
    {
      id: 4,
      rank: 4,
      image:
        "https://lh3.googleusercontent.com/aida-public/AB6AXuB327VpoL2y_cTzMMFmjw3FknDDXzT2m4-tHt7QIRNeOr-GlQv1QeKF3mZl_8N6furFSog94qSiQu4X-k568zKhuJxTXUu5W6P7xyg5AvlchiUq9lVH8jVXtXBspItMLkUzmwoe-ow_n-oBha-wrZro0xNN1YgRN0sAJubP22a5FWfawJrZvbdFlpKRa-Z6BGQ_gu5XWnz8cSAAmmQn1XD3g45ko7YspVGAhsiabeENUlwgy-BxZFkOIdqWcT3UCWO85zUmecsz5Ec",
      artist: "@AI_Maverick",
      votes: 756,
      title: "Electric Dreams",
      description:
        "Vibrant electric colors illuminate this cyberpunk vision, where technology and humanity coexist in a neon-soaked urban landscape.",
    },
    {
      id: 5,
      rank: 5,
      image:
        "https://lh3.googleusercontent.com/aida-public/AB6AXuDPEdbdZtTMy6M-oJHvJSaviMziFeDCOVK46ffLwawoIBMMB2B5eQ_Ppy_28hN2uRrT4LCx43DaUDtzct22Vox8R9WFtouQyxtllVZUUVs7YckWeDqf14DqFCcfbQJhIDmiv6i9zQdK2Ee9Xxje2vRFbYP7nEaK06IYGQ1nAGhTIX2UfM0xQJ9l9yNwWdNTSlQeM_8rxvVUTxRywO2HQ0iu1dqqXZcao_BeUNf1eyKUydI5xO0Z3Ef-4Spzr4-kBDfYb_JVDenpoFI",
      artist: "@GlitchArt",
      votes: 634,
      title: "Urban Synthesis",
      description:
        "A synthesis of organic and synthetic elements creates this unique cyberpunk cityscape, blending nature with high-tech architecture.",
    },
  ];

  const allSubmissions = [
    {
      id: 6,
      image:
        "https://lh3.googleusercontent.com/aida-public/AB6AXuB6LAuZTz0K8X-y8tdsB8ojZaqlGDbX8lHRUBcl8NmSod_JIye0JuHRzlcshUBbbfEc1soVi55t03ea6BabgDELQ4qwY9vJr8yd5UJ9hnXqZ-FsZrWIx1PNObo4WTWNosjSqk-fzS51CfKUS8HWUzdS6vvb3syozJAyopcQ5ZBU_b2nEw8Z6fJUIuGjTXoGofz3aTbwwe4XeoIqHdLzqIwpHbd9pqGjK8zFjqlnDWllxCFp6sbjDo1B-dFecPEvUDtaWEAtowYNLfY",
      artist: "@DataStream",
      votes: 423,
      title: "Data Stream City",
      description:
        "Information flows like rivers through this digital metropolis, where data streams create the very fabric of the urban environment.",
    },
    {
      id: 7,
      image:
        "https://lh3.googleusercontent.com/aida-public/AB6AXuBAQMq3ssOCKzmGk5YdqOcPv6yNjesmzOxuni6mVtVEbUlpfO14NMkPm19x9dc7NTkk6OfO3w9hHdK97qlWr02qdTb03T0-JQokbSdxsMw11T5q8Y9Z-KV4QfiJbZZAnd_mEDxsAb-unF5XIwHtrlvzqPn9au4T2PZFDc5hx1ErZbbcdJgz5ubJUsVVLq6-uo7-hz9kT6F-9fnAy7Vbg842U3vVGWRUCzxbB3EiWtEAkxQFB_EoEEeZDomFF5bQX4TWAPKDzc6svnI",
      artist: "@DigitalPunk",
      votes: 387,
      title: "Neon Noir",
      description:
        "A dark cyberpunk vision where neon lights cut through the shadows of a dystopian future city.",
    },
    {
      id: 8,
      image:
        "https://lh3.googleusercontent.com/aida-public/AB6AXuD5rm2G9vXO3-NRa7yczppc-rF0xgZLzR0Ayxs_lz2ZNH1h5en6fVnm07WIEduALJ38V12KJlHWYearhAWdkx2pnatlI_TIcvZg8b7SPxv5VCCy27XuU_ocJucwZczo5O4lHtKo4khWp0f4lrgjJWXbqLUQCjFjIJ9LYqMz0AgQ01GeuqB-iCOwn9vPi9lG_QhLAAYqI2ReppdjyPneC3kyC2F9_ZrXW1IwMIOjEXI5JHg8N1afnk_NJxR5nFM5FHQSqHlXYdBj13A",
      artist: "@CosmicVision",
      votes: 356,
      title: "Quantum Bloom",
      description:
        "Where quantum physics meets digital art, creating a mesmerizing blend of science and creativity.",
    },
    {
      id: 9,
      image:
        "https://lh3.googleusercontent.com/aida-public/AB6AXuAgXTzG5WxSgKfmziqK6MdiPcDz1nxqASTDRLgr98YGIQJo_gF16lfvuASvBs67wiLG6l0ojCc8M421Yu_we62fO8mZhBvuVQjUUs2Zj38UJIMgbAONgWicVlVbfxQgy581IpyHFjB2zGvy2Q12QyGV33gE8K6j6P3WJT-KTvK_98viA90EzjRcLlqL2kr16U4RcPbsL5BIehag9Posz76T1_yoVvlbTTVePiR7hhPB5Q0Y0MpBOhv5WXnvYW7JcIYwWnplOI_TrLI",
      artist: "@NeonNoir",
      votes: 298,
      title: "Future Relics",
      description:
        "Ancient meets future in this stunning cyberpunk interpretation of archaeological discoveries.",
    },
  ];

  // handleEnterContest removed (not used) to avoid lint warnings

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedContest(null);
  };

  const handleExpandSubmission = (submission: any) => {
    setSelectedSubmission(submission);
    setIsLightboxOpen(true);
  };

  const handleCloseLightbox = () => {
    setIsLightboxOpen(false);
    setSelectedSubmission(null);
  };

  const handleVoteSubmission = (submissionId: number) => {
    // Handle voting logic here
    console.log("Voting for submission:", submissionId);
  };

  const handleShowUpload = () => {
    setShowUploadSelection(true);
  };

  const handleSelectExistingArtwork = (artwork: any) => {
    console.log("Selected existing artwork:", artwork);
    // Here you would handle submitting the existing artwork to the contest
    setShowUploadSelection(false);
  };

  const handleUploadNewArtwork = () => {
    setShowUploadSelection(false);
    setShowUploadCard(true);
  };

  const handleCloseUpload = () => {
    setShowUploadCard(false);
  };

  const handleSubmitArtwork = async (data: any) => {
    console.log("Submitting artwork:", data);
    setShowUploadCard(false);
  };

  return (
    <>
      <div className="flex-1 px-4 py-8 sm:px-6 md:px-10 lg:px-20">
        <div className="mx-auto max-w-screen-xl">
          {/* Header Controls - Contest Type Selector, Timer, Prize Pool */}
          <div className="mb-12 flex flex-col items-center justify-between gap-8">
            {/* Contest Type Selector and Upload Button */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 w-full">
              <div className="w-full max-w-sm text-center">
                <h1 className="text-2xl font-bold text-white mb-2">
                  {contest.title}
                </h1>
              </div>
              <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
                <GlassButton
                  onClick={handleShowUpload}
                  className="flex flex-shrink-0 items-center justify-center gap-2 px-6 py-3 text-base font-bold w-full sm:w-auto"
                >
                  <Upload className="h-5 w-5" />
                  Upload
                </GlassButton>
                <button
                  onClick={() => setShowRules(true)}
                  className="flex flex-shrink-0 items-center justify-center gap-2 rounded-lg bg-primary px-6 py-3 text-base font-bold text-white shadow-lg shadow-primary/30 transition-all hover:scale-105 hover:shadow-primary/50 w-full sm:w-auto"
                >
                  <FileText className="h-5 w-5" />
                  Contest Rules
                </button>
              </div>
            </div>

            <div className="flex flex-col lg:flex-row w-full items-center justify-center gap-8">
              {/* Contest Timer */}
              <div className="w-full max-w-lg rounded-xl bg-gradient-to-br from-primary/20 to-purple-600/20 p-3 sm:p-4 text-center border border-primary/30 backdrop-blur-sm">
                <p className="text-sm font-medium text-primary text-glow mb-3">
                  Contest Ends In:
                </p>
                <div className="flex items-center justify-center gap-2 sm:gap-3">
                  <div className="flex flex-col items-center">
                    <div className="bg-black/30 rounded-lg px-2 py-1 min-w-[40px] backdrop-blur-sm border border-primary/20">
                      <span className="text-lg sm:text-xl font-bold text-white text-glow">
                        {String(timeLeft.days).padStart(2, "0")}
                      </span>
                    </div>
                    <span className="text-xs text-gray-300 mt-1 font-medium">
                      Days
                    </span>
                  </div>
                  <span className="text-lg sm:text-xl font-bold text-primary text-glow animate-pulse">
                    :
                  </span>
                  <div className="flex flex-col items-center">
                    <div className="bg-black/30 rounded-lg px-2 py-1 min-w-[40px] backdrop-blur-sm border border-primary/20">
                      <span className="text-lg sm:text-xl font-bold text-white text-glow">
                        {String(timeLeft.hours).padStart(2, "0")}
                      </span>
                    </div>
                    <span className="text-xs text-gray-300 mt-1 font-medium">
                      Hours
                    </span>
                  </div>
                  <span className="text-lg sm:text-xl font-bold text-primary text-glow animate-pulse">
                    :
                  </span>
                  <div className="flex flex-col items-center">
                    <div className="bg-black/30 rounded-lg px-2 py-1 min-w-[40px] backdrop-blur-sm border border-primary/20">
                      <span className="text-lg sm:text-xl font-bold text-white text-glow">
                        {String(timeLeft.minutes).padStart(2, "0")}
                      </span>
                    </div>
                    <span className="text-xs text-gray-300 mt-1 font-medium">
                      Mins
                    </span>
                  </div>
                  <span className="text-lg sm:text-xl font-bold text-primary text-glow animate-pulse">
                    :
                  </span>
                  <div className="flex flex-col items-center">
                    <div className="bg-black/30 rounded-lg px-2 py-1 min-w-[40px] backdrop-blur-sm border border-primary/20">
                      <span className="text-lg sm:text-xl font-bold text-white text-glow animate-pulse">
                        {String(timeLeft.seconds).padStart(2, "0")}
                      </span>
                    </div>
                    <span className="text-xs text-gray-300 mt-1 font-medium">
                      Secs
                    </span>
                  </div>
                </div>
              </div>

              {/* Prize Pool Section */}
              <div className="w-full max-w-lg rounded-xl border-2 border-primary/30 bg-gradient-to-br from-primary/10 to-purple-600/10 p-3 sm:p-4 glow-border backdrop-blur-sm">
                <h3 className="mb-4 text-center text-xl sm:text-2xl font-bold text-white text-glow">
                  {contest.prizePool}
                </h3>
                <div className="grid grid-cols-3 gap-2 sm:gap-3 text-center">
                  <div className="flex flex-col items-center justify-center rounded-lg bg-primary/10 p-2 transition-all hover:bg-primary/20 hover:scale-105">
                    <div className="w-6 h-6 rounded-full bg-gradient-to-r from-yellow-400 to-yellow-600 flex items-center justify-center mb-1">
                      <span className="text-xs font-bold text-black">1st</span>
                    </div>
                    <p className="text-sm sm:text-base font-bold text-white mb-1">
                      50%
                    </p>
                    <p className="text-xs text-primary font-medium">$GLORY</p>
                  </div>
                  <div className="flex flex-col items-center justify-center rounded-lg bg-primary/10 p-2 transition-all hover:bg-primary/20 hover:scale-105">
                    <div className="w-6 h-6 rounded-full bg-gradient-to-r from-gray-300 to-gray-500 flex items-center justify-center mb-1">
                      <span className="text-xs font-bold text-black">2nd</span>
                    </div>
                    <p className="text-sm sm:text-base font-bold text-white mb-1">
                      30%
                    </p>
                    <p className="text-xs text-primary font-medium">$GLORY</p>
                  </div>
                  <div className="flex flex-col items-center justify-center rounded-lg bg-primary/10 p-2 transition-all hover:bg-primary/20 hover:scale-105">
                    <div className="w-6 h-6 rounded-full bg-gradient-to-r from-orange-400 to-orange-600 flex items-center justify-center mb-1">
                      <span className="text-xs font-bold text-black">3rd</span>
                    </div>
                    <p className="text-sm sm:text-base font-bold text-white mb-1">
                      20%
                    </p>
                    <p className="text-xs text-primary font-medium">$GLORY</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Top 5 Most Liked */}
          <div className="mt-12">
            <h3 className="mb-8 text-center text-3xl font-bold text-gray-900 dark:text-white text-glow">
              Top 3 Most Liked
            </h3>

            {/* Pyramid Layout - Top 3 */}
            <div className="flex flex-col items-center gap-6">
              {/* First Place - Top of pyramid */}
              <div className="w-full max-w-sm">
                <ProductCard
                  artwork={{
                    id: topSubmissions[0].id,
                    title: topSubmissions[0].title,
                    artist: topSubmissions[0].artist,
                    likes: topSubmissions[0].votes,
                    image: topSubmissions[0].image,
                    rating: 0,
                    price: "",
                    prompt: undefined,
                    promptPrice: undefined,
                  }}
                  onExpandContestEntry={handleExpandSubmission}
                />
              </div>

              {/* Second and Third Place - Bottom of pyramid */}
              <div className="flex w-full max-w-2xl justify-center gap-6">
                {topSubmissions.slice(1, 3).map((submission) => (
                  <div key={submission.id} className="w-1/2">
                    <ProductCard
                      artwork={{
                        id: submission.id,
                        title: submission.title,
                        artist: submission.artist,
                        likes: submission.votes,
                        image: submission.image,
                        rating: 0,
                        price: "",
                        prompt: undefined,
                        promptPrice: undefined,
                      }}
                      onExpandContestEntry={handleExpandSubmission}
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Sticky Toolbar */}
          <div className="sticky top-[100px] z-40 mt-12 rounded-lg bg-background-dark/80 px-4 py-4 backdrop-blur-sm glow-border">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="relative w-full sm:w-auto">
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="w-full appearance-none rounded-lg border-primary/30 bg-background-dark/50 py-2 pl-3 pr-8 text-sm text-white placeholder-gray-400 transition-all focus:border-primary focus:ring-1 focus:ring-primary sm:w-auto"
                  >
                    <option>Sort by: Most Voted</option>
                    <option>Sort by: Newest</option>
                    <option>Sort by: Oldest</option>
                  </select>
                  <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                    <ChevronDown className="h-4 w-4" />
                  </span>
                </div>
              </div>
              <div className="flex w-full items-center gap-4 sm:w-auto">
                <div className="relative w-full flex-1 max-w-xs sm:w-auto">
                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                    <Search className="h-5 w-5" />
                  </span>
                  <input
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full rounded-lg border-primary/30 bg-background-dark/50 py-2 pl-10 pr-4 text-sm text-white placeholder-gray-400 transition-all focus:border-primary focus:ring-1 focus:ring-primary"
                    placeholder="Search entries..."
                    type="search"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* All Submissions */}
          <div className="mt-8">
            <h3 className="mb-6 text-2xl font-bold text-gray-900 dark:text-white">
              All Submissions
            </h3>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
              {allSubmissions.map((submission) => (
                <ProductCard
                  key={submission.id}
                  artwork={{
                    id: submission.id,
                    title: submission.title,
                    artist: submission.artist,
                    likes: submission.votes,
                    image: submission.image,
                    rating: 0,
                    price: "",
                    prompt: undefined,
                    promptPrice: undefined,
                  }}
                  onExpandContestEntry={handleExpandSubmission}
                />
              ))}
            </div>

            {/* Pagination */}
            <div className="mt-8 flex items-center justify-center space-x-2">
              <button className="flex h-9 w-9 items-center justify-center rounded-full text-gray-500 transition-colors hover:bg-primary/10 hover:text-primary dark:text-gray-400 dark:hover:bg-primary/20">
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
              <button className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-sm font-bold text-white">
                1
              </button>
              <button className="flex h-9 w-9 items-center justify-center rounded-full text-sm font-medium text-gray-600 transition-colors hover:bg-primary/10 hover:text-primary dark:text-gray-400 dark:hover:bg-primary/20">
                2
              </button>
              <button className="flex h-9 w-9 items-center justify-center rounded-full text-sm font-medium text-gray-600 transition-colors hover:bg-primary/10 hover:text-primary dark:text-gray-400 dark:hover:bg-primary/20">
                3
              </button>
              <span className="flex h-9 w-9 items-center justify-center text-sm text-gray-500 dark:text-gray-400">
                ...
              </span>
              <button className="flex h-9 w-9 items-center justify-center rounded-full text-sm font-medium text-gray-600 transition-colors hover:bg-primary/10 hover:text-primary dark:text-gray-400 dark:hover:bg-primary/20">
                10
              </button>
              <button className="flex h-9 w-9 items-center justify-center rounded-full text-gray-500 transition-colors hover:bg-primary/10 hover:text-primary dark:text-gray-400 dark:hover:bg-primary/20">
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

      {/* Contest Modal */}
      {selectedContest && (
        <ContestModal
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          contest={selectedContest}
        />
      )}

      {/* Contest Lightbox Modal */}
      {selectedSubmission && (
        <ContestLightboxModal
          isOpen={isLightboxOpen}
          onClose={handleCloseLightbox}
          submission={selectedSubmission}
          onVote={handleVoteSubmission}
          isVoted={false} // You can track this in state if needed
        />
      )}

      {/* Upload Card Modal */}
      {showUploadCard && (
        <UploadCard
          isModal={true}
          contestTitle={contest.title}
          contestPrize={contest.prizePool}
          onClose={handleCloseUpload}
          onSubmit={handleSubmitArtwork}
        />
      )}

      {/* Upload Selection Modal */}
      {showUploadSelection && (
        <UploadSelectionModal
          isOpen={showUploadSelection}
          onClose={() => setShowUploadSelection(false)}
          onSelectExisting={handleSelectExistingArtwork}
          onUploadNew={handleUploadNewArtwork}
        />
      )}

      {/* Contest Rules Modal */}
      {showRules && (
        <ContestRulesCard
          isModal={true}
          contestTitle={contest.title}
          onClose={() => setShowRules(false)}
        />
      )}
    </>
  );
}
