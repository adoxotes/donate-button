import React, { useRef, useCallback, useState } from "react";
import {
  createPublicClient,
  createWalletClient,
  custom,
  http,
  parseUnits,
} from "viem";
import { anvil } from "viem/chains";

// Address of the FundMe smart contract that receives the tips.
const FUND_ME_ADDRESS = "0xe7f1725e7734ce288f8367e1bb143e90bb3f0512";

// Address of the Mock USDC token contract on the local network.
const USDC_ADDRESS = "0x5fbdb2315678afecb367f032d93f642f64180aa3";

// Minimal ABI for the USDC ERC20 token to handle approvals.
const USDC_ABI = [
  {
    name: "approve",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ name: "", type: "bool" }],
  },
] as const;

// Minimal ABI for the FundMe contract to handle the tipping logic.
const FUND_ME_ABI = [
  {
    name: "fund",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [{ name: "_amount", type: "uint256" }],
    outputs: [],
  },
] as const;

declare global {
  interface Window {
    ethereum?: any;
  }
}

/**
 * Internal state used to track the physics and visual properties of the coin toss.
 * @remarks
 * Stored in a ref to avoid React re-renders during high-frequency animation frames.
 */
interface AnimationState {
  /** Total number of frames for the toss arc */
  maxLoops: number;
  /** Final randomized rotation on the Y-axis */
  sideRotation: number;
  /** Intensity of the flip (total radians to rotate) */
  maxFlipAngle: number;
  /** Current frame index */
  currentLoop: number;
  /** Current rotation angle in radians */
  angle: number;
  /** Whether the coin is currently paused at its apex waiting for transaction confirmation */
  isHovering: boolean;
  /** Whether the coin is descending back to the button after confirmation */
  isDescending: boolean;
  /** Whether the animation loop is currently active */
  isAnimating: boolean;
}

/**
 * A interactive button component that performs a 3D coin toss animation
 * synchronized with a blockchain transaction.
 */
const TipButton: React.FC = () => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const coinRef = useRef<HTMLDivElement>(null);

  const getFriendlyErrorMessage = (error: any): string => {
    const message = error?.message || "";
    if (message.includes("HTTP request failed")) {
      return "Cannot connect to blockchain RPC node.";
    }
    if (message.includes("returned no data")) {
      return "The funding contract has not been deployed on this blockchain.";
    }
    if (message.includes("User rejected the request")) {
      return "User rejected the request.";
    }
    return "An unexpected error occurred.";
  };

  const state = useRef<AnimationState>({
    maxLoops: 97,
    sideRotation: 0,
    maxFlipAngle: 0,
    currentLoop: 0,
    angle: 0,
    isHovering: false,
    isDescending: false,
    isAnimating: false,
  });

  const updateStyles = useCallback(
    (updates: Record<string, string | number>) => {
      const coin = coinRef.current;
      if (!coin) return;
      Object.entries(updates).forEach(([key, val]) => {
        // Direct property vs CSS variable
        key === "opacity"
          ? (coin.style.opacity = val.toString())
          : coin.style.setProperty(`--${key}`, val.toString());
      });
    },
    [],
  );

  /**
   * Reset visual multipliers to initial state.
   */
  const resetCoin = useCallback(() => {
    state.current = {
      ...state.current,
      isHovering: false,
      isDescending: false,
      isAnimating: false,
    };
    setIsSuccess(false);
    buttonRef.current?.classList.remove(
      "is-hovering",
      "clicked",
      "coin-landed",
    );

    updateStyles({
      "coin-x-multiplier": 0,
      "coin-y-multiplier": 0,
      "coin-scale-multiplier": 0,
      "back-scale-multiplier": 1,
      "coin-rotation-multiplier": 0,
      "shine-opacity-multiplier": 0.1,
      "shine-bg-multiplier": "50%",
      opacity: 1,
    });
  }, [updateStyles]);

  /**
   * The main animation loop (RAF). Handles physics, mid-air pausing, and landing logic.
   */
  const renderFrame = useCallback(() => {
    const s = state.current;
    const coin = coinRef.current;
    if (!coin || !s.isAnimating) return;

    // Transition: if we hit mid-arc and no confirmation response yet, enter hover state
    if (!s.isDescending && s.currentLoop >= s.maxLoops / 2 && !s.isHovering) {
      s.isHovering = true;
      buttonRef.current?.classList.add("is-hovering");
    }

    if (s.isHovering) {
      s.angle += ((1 - Math.pow(1 / s.maxLoops - 1, 2)) * s.maxFlipAngle) / 2;
    } else {
      s.currentLoop++;
      const progress = s.currentLoop / s.maxLoops;
      s.angle = -s.maxFlipAngle * Math.pow(progress - 1, 2) + s.maxFlipAngle;

      updateStyles({
        "coin-y-multiplier": -6 * Math.pow(progress * 2 - 1, 2) + 6,
        "coin-x-multiplier": progress,
        "coin-scale-multiplier": progress * 0.05,
        "coin-rotation-multiplier": progress * s.sideRotation,
      });
    }

    // Mimic 3d with sine/cosine to flip front/middle/back faces of the "coin"
    const sinAngle = Math.sin(s.angle);
    const cosAngle = Math.cos(s.angle);
    const offsetAngle = (s.angle + Math.PI / 2) % Math.PI;

    updateStyles({
      "front-scale-multiplier": Math.max(cosAngle, 0),
      "front-y-multiplier": sinAngle,
      "middle-scale-multiplier": Math.abs(cosAngle),
      "middle-y-multiplier": Math.cos(offsetAngle),
      "back-scale-multiplier": Math.max(Math.cos(s.angle - Math.PI), 0),
      "back-y-multiplier": Math.sin(s.angle - Math.PI),
      "shine-opacity-multiplier": 4 * Math.sin(offsetAngle) - 3.2,
      "shine-bg-multiplier": `${-40 * (Math.cos(offsetAngle) - 0.5)}%`,
    });

    if (s.isHovering || s.currentLoop < s.maxLoops) {
      requestAnimationFrame(renderFrame);
    } else {
      // Landing Sequence: Wait for impact, then fade out and reset
      buttonRef.current?.classList.add("coin-landed");
      updateStyles({ opacity: 0 });

      setTimeout(() => {
        buttonRef.current?.classList.remove("clicked", "coin-landed");
        setTimeout(resetCoin, 300);
      }, 1500);
    }
  }, [updateStyles, resetCoin]);

  /**
   * Initializes a new toss with randomized rotation and flip intensity.
   * Also triggers the USDC transaction on-chain.
   */
  const handleTrigger = useCallback(async () => {
    if (state.current.isAnimating || isProcessing) return;

    if (!window.ethereum) {
      alert("Please install a wallet like MetaMask to tip!");
      return;
    }

    // Start the visual toss animation
    state.current = {
      ...state.current,
      isAnimating: true,
      currentLoop: 0,
      isDescending: false,
      isHovering: false,
      sideRotation: Math.floor(Math.random() * 5) * 90,
      maxFlipAngle: (Math.floor(Math.random() * 4) + 3) * Math.PI,
    };

    buttonRef.current?.classList.add("clicked");
    setTimeout(renderFrame, 50);

    // Handle Blockchain Transaction
    setIsProcessing(true);
    try {
      const walletClient = createWalletClient({
        chain: anvil,
        transport: custom(window.ethereum),
      });

      const currentChainId = await walletClient.getChainId();
      if (currentChainId !== anvil.id) {
        await walletClient.switchChain({ id: anvil.id });
      }

      const publicClient = createPublicClient({
        chain: anvil,
        transport: http(),
      });

      const [address] = await walletClient.requestAddresses();
      const amount = parseUnits("1", 6);

      // Approve USDC transfer
      const { request: approveReq } = await publicClient.simulateContract({
        account: address,
        address: USDC_ADDRESS,
        abi: USDC_ABI,
        functionName: "approve",
        args: [FUND_ME_ADDRESS, amount],
      });
      const approveHash = await walletClient.writeContract(approveReq);
      await publicClient.waitForTransactionReceipt({ hash: approveHash });

      // Fund the contract
      const { request: fundReq } = await publicClient.simulateContract({
        account: address,
        address: FUND_ME_ADDRESS,
        abi: FUND_ME_ABI,
        functionName: "fund",
        args: [amount],
      });
      const fundHash = await walletClient.writeContract(fundReq);
      await publicClient.waitForTransactionReceipt({ hash: fundHash });

      // On Success: Signal the animation to complete its descent
      setErrorMessage(null);
      setIsSuccess(true);
      state.current.isHovering = false;
      state.current.isDescending = true;
      buttonRef.current?.classList.remove("is-hovering");
    } catch (error: any) {
      console.error("Transaction failed:", error);
      setErrorMessage(getFriendlyErrorMessage(error));
      resetCoin();
    } finally {
      setIsProcessing(false);
    }
  }, [renderFrame, isProcessing, resetCoin]);

  const renderButtonContent = () => {
    if (isSuccess) return "Thank you!";
    if (isProcessing) {
      return (
        <>
          Processing
          <span className="dots">
            <span>.</span>
            <span>.</span>
            <span>.</span>
          </span>
        </>
      );
    }
    return "Send a tip!";
  };

  return (
    <div className="tip-button-container">
      <button
        className="tip-button"
        ref={buttonRef}
        onClick={handleTrigger}
        disabled={isProcessing || isSuccess}
      >
        <span className="tip-button__text">{renderButtonContent()}</span>
        <div className="coin" ref={coinRef}>
          <div className="coin__front" />
          <div className="coin__middle" />
          <div className="coin__back" />
        </div>
      </button>

      {errorMessage && (
        <div className="error-card">
          <div className="error-card__content">
            <div className="error-card__header">
              <span className="error-card__title">Oops!</span>
              <button
                className="error-card__close"
                onClick={() => setErrorMessage(null)}
              >
                &times;
              </button>
            </div>
            <div className="error-card__body">{errorMessage}</div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TipButton;
