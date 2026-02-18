"use client";

import { useState, useEffect } from "react";
import { Share2, Check, Copy } from "lucide-react";

export default function ShareButton() {
    const [isCopied, setIsCopied] = useState(false);
    const [showTooltip, setShowTooltip] = useState(false);

    // Show the "Share with friends" illusion after 2 seconds
    useEffect(() => {
        const timer = setTimeout(() => setShowTooltip(true), 2000);
        return () => clearTimeout(timer);
    }, []);

    const handleShare = async () => {
        const shareData = {
            title: 'H-1B Wage Map 2027',
            text: 'Check your H-1B lottery odds with the new FY2027 Weighted Selection Rule!',
            url: window.location.href,
        };

        // Try Native Share (Mobile)
        if (navigator.share && navigator.canShare(shareData)) {
            try {
                await navigator.share(shareData);
            } catch (err) {
                console.log("Share cancelled");
            }
        } else {
            // Fallback: Copy to Clipboard (Desktop)
            try {
                await navigator.clipboard.writeText(window.location.href);
                setIsCopied(true);
                setTimeout(() => setIsCopied(false), 2000); // Reset after 2s
            } catch (err) {
                console.error("Failed to copy", err);
            }
        }
    };

    return (
        <div className="relative group z-40">
            {/* THE ILLUSION POP-UP (Tooltip) */}
            <div 
                className={`
                    absolute -top-12 left-1/2 -translate-x-1/2 
                    bg-blue-900 text-white text-xs font-bold px-3 py-1.5 rounded-lg shadow-xl
                    transition-all duration-500 transform whitespace-nowrap
                    ${showTooltip ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2 pointer-events-none"}
                `}
            >
                Share with friends! 🚀
                {/* Little triangle arrow pointing down */}
                <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-blue-900 rotate-45"></div>
            </div>

            {/* THE BUTTON */}
            <button
                onClick={handleShare}
                className={`
                    relative flex items-center gap-2 px-4 py-2 rounded-full font-bold text-sm transition-all shadow-sm
                    ${isCopied 
                        ? "bg-green-100 text-green-700 border border-green-200" 
                        : "bg-white text-blue-700 border border-blue-100 hover:border-blue-300 hover:bg-blue-50"
                    }
                `}
            >
                {/* Pulse Animation Ring (Only when not copied) */}
                {!isCopied && (
                    <span className="absolute inset-0 rounded-full border border-blue-400 opacity-0 animate-ping"></span>
                )}

                {isCopied ? (
                    <>
                        <Check className="w-4 h-4" />
                        <span>Link Copied!</span>
                    </>
                ) : (
                    <>
                        <Share2 className="w-4 h-4" />
                        <span>Share</span>
                    </>
                )}
            </button>
        </div>
    );
}