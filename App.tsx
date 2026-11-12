/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import confetti from 'canvas-confetti';
import {
  Volume2,
  VolumeX,
  HelpCircle,
  Sparkles,
  Trophy,
  RotateCcw,
  CheckCircle2,
  XCircle,
  Eye,
  EyeOff,
  ArrowRight,
  ArrowLeft,
  Award,
  BookOpen,
  Compass,
  UtensilsCrossed,
  Trophy as SoccerIcon,
  Play,
  Flame,
  Star
} from 'lucide-react';
import {
  QUESTIONS_DATA,
  TARGET_WORD,
  SPANISH_ALPHABET,
  type Question,
  type OptionItem,
} from './questions.ts';
import { sounds } from './sound.ts';

export default function App() {
  // Game state
  const [currentIdx, setCurrentIdx] = useState<number>(0);
  const [revealedLetters, setRevealedLetters] = useState<Set<string>>(new Set());
  const [guessedLetters, setGuessedLetters] = useState<Set<string>>(new Set());
  const [answersState, setAnswersState] = useState<
    Record<number, { selected: 'A' | 'B' | 'C' | 'D'; isCorrect: boolean; attempts: number }>
  >({});
  const [canPickLetter, setCanPickLetter] = useState<boolean>(false);
  const [pendingLetterPicks, setPendingLetterPicks] = useState<number>(0);

  // Translation visibility toggles
  // Maps item id to boolean (e.g. "q-1", "opt-1-A")
  const [translationsVisible, setTranslationsVisible] = useState<Record<string, boolean>>({});
  const [autoShowTranslations, setAutoShowTranslations] = useState<boolean>(false);

  // Wheel state
  const [wheelRotation, setWheelRotation] = useState<number>(0);
  const [isSpinning, setIsSpinning] = useState<boolean>(false);
  const [wheelBonusMsg, setWheelBonusMsg] = useState<string | null>(null);
  const [score, setScore] = useState<number>(0);

  // Game completion
  const [isGameOver, setIsGameOver] = useState<boolean>(false);
  const [solveModalOpen, setSolveModalOpen] = useState<boolean>(false);
  const [solveWordInput, setSolveWordInput] = useState<string>('');
  const [solveError, setSolveError] = useState<string | null>(null);
  const [vocabularyReviewOpen, setVocabularyReviewOpen] = useState<boolean>(false);

  // Sound state
  const [soundEnabled, setSoundEnabled] = useState<boolean>(sounds.enabled);

  const wheelRef = useRef<HTMLDivElement>(null);

  const currentQ: Question = QUESTIONS_DATA[currentIdx];
  const totalQuestions = QUESTIONS_DATA.length;
  const currentAnswer = answersState[currentQ.id];

  // Target word letter setup
  const targetLetters = TARGET_WORD.split('');
  const uniqueTargetLetters = Array.from(new Set(targetLetters));
  const isWordFullyRevealed = uniqueTargetLetters.every((char) => revealedLetters.has(char));

  // Check victory condition
  useEffect(() => {
    if (isWordFullyRevealed && !isGameOver) {
      setIsGameOver(true);
      sounds.playFanfare();
      triggerGrandConfetti();
    }
  }, [isWordFullyRevealed, isGameOver]);

  const toggleSound = () => {
    const next = sounds.toggleSound();
    setSoundEnabled(next);
  };

  const triggerGrandConfetti = () => {
    confetti({
      particleCount: 120,
      spread: 80,
      origin: { y: 0.6 },
    });
    setTimeout(() => {
      confetti({
        particleCount: 80,
        spread: 100,
        origin: { x: 0.2, y: 0.5 },
      });
      confetti({
        particleCount: 80,
        spread: 100,
        origin: { x: 0.8, y: 0.5 },
      });
    }, 350);
  };

  // Toggle individual translation
  const toggleTranslation = (key: string) => {
    sounds.playClick();
    setTranslationsVisible((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const isVisible = (key: string) => {
    if (autoShowTranslations) return true;
    return !!translationsVisible[key];
  };

  // Handle Option selection
  const handleSelectOption = (key: 'A' | 'B' | 'C' | 'D') => {
    sounds.playClick();
    const isCorrect = key === currentQ.correct;

    const prevAttempts = answersState[currentQ.id]?.attempts || 0;

    setAnswersState((prev) => ({
      ...prev,
      [currentQ.id]: {
        selected: key,
        isCorrect,
        attempts: prevAttempts + 1,
      },
    }));

    if (isCorrect) {
      sounds.playCorrect();
      // Add points
      const pointsEarned = prevAttempts === 0 ? 150 : 75;
      setScore((s) => s + pointsEarned);

      // Unlock letter pick!
      setCanPickLetter(true);
      setPendingLetterPicks((p) => p + 1);

      // Mini confetti on correct
      confetti({
        particleCount: 30,
        spread: 50,
        origin: { y: 0.7 },
      });
    } else {
      sounds.playWrong();
      // On incorrect answer: player can still continue playing without being blocked!
    }
  };

  // Handle Letter Choice from Spanish Alphabet
  const handlePickLetter = (letter: string) => {
    if (guessedLetters.has(letter)) return;

    sounds.playClick();
    const newGuessed = new Set(guessedLetters);
    newGuessed.add(letter);
    setGuessedLetters(newGuessed);

    const isInWord = targetLetters.includes(letter);

    if (isInWord) {
      sounds.playLetterReveal();
      const newRevealed = new Set(revealedLetters);
      newRevealed.add(letter);
      setRevealedLetters(newRevealed);

      // Count occurrences
      const count = targetLetters.filter((l) => l === letter).length;
      setScore((s) => s + count * 200);

      confetti({
        particleCount: 45,
        spread: 60,
        origin: { y: 0.5 },
      });
    } else {
      sounds.playWrong();
    }

    // Decrement pending picks
    const remaining = pendingLetterPicks - 1;
    setPendingLetterPicks(Math.max(0, remaining));
    if (remaining <= 0) {
      setCanPickLetter(false);
    }
  };

  // Spin Wheel Bonus (Поле Чудес барабан)
  const spinWheel = () => {
    if (isSpinning) return;
    setIsSpinning(true);
    setWheelBonusMsg(null);

    const extraSpins = 4 + Math.floor(Math.random() * 4);
    const randomAngle = Math.floor(Math.random() * 360);
    const totalRotation = wheelRotation + extraSpins * 360 + randomAngle;

    sounds.playWheelTick();
    const tickInterval = setInterval(() => {
      sounds.playWheelTick();
    }, 180);

    setWheelRotation(totalRotation);

    setTimeout(() => {
      clearInterval(tickInterval);
      setIsSpinning(false);

      // Determine award
      const sectors = [
        { label: '+250 միավոր', type: 'points', val: 250 },
        { label: '★ Բոնուս տառի ընտրություն', type: 'letterPick', val: 1 },
        { label: '+500 միավոր', type: 'points', val: 500 },
        { label: '«Сектор +» (Բացել 1 տառ)', type: 'revealChar', val: 1 },
        { label: '+100 միավոր', type: 'points', val: 100 },
        { label: '+1000 Ջեկպոտ!', type: 'points', val: 1000 },
      ];
      const normalizedAngle = (360 - (totalRotation % 360)) % 360;
      const index = Math.floor(normalizedAngle / (360 / sectors.length));
      const prize = sectors[index % sectors.length];

      if (prize.type === 'points') {
        setScore((s) => s + prize.val);
        setWheelBonusMsg(`🎉 Բարաբանը կանգնեց՝ ${prize.label}!`);
        sounds.playCorrect();
      } else if (prize.type === 'letterPick') {
        setPendingLetterPicks((p) => p + 1);
        setCanPickLetter(true);
        setWheelBonusMsg(`✨ Դուք ստացաք այբուբենից տառ ընտրելու լրացուցիչ իրավունք!`);
        sounds.playCorrect();
      } else if (prize.type === 'revealChar') {
        // reveal a random remaining letter in MARCADOR
        const remainingChars = uniqueTargetLetters.filter((c) => !revealedLetters.has(c));
        if (remainingChars.length > 0) {
          const charToOpen = remainingChars[Math.floor(Math.random() * remainingChars.length)];
          const newRevealed = new Set(revealedLetters);
          newRevealed.add(charToOpen);
          setRevealedLetters(newRevealed);
          const newGuessed = new Set(guessedLetters);
          newGuessed.add(charToOpen);
          setGuessedLetters(newGuessed);
          setWheelBonusMsg(`🎁 «Сектор +»! Բացվեց «${charToOpen}» տառը!`);
          sounds.playLetterReveal();
        } else {
          setScore((s) => s + 500);
          setWheelBonusMsg(`🎉 Բոլոր տառերն արդեն բացված են! +500 միավոր!`);
        }
      }
    }, 3200);
  };

  // Solve Word Directly
  const handleSolveWordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanInput = solveWordInput.trim().toUpperCase();
    if (!cleanInput) return;

    if (cleanInput === TARGET_WORD) {
      setRevealedLetters(new Set(uniqueTargetLetters));
      setGuessedLetters((prev) => new Set([...prev, ...uniqueTargetLetters]));
      setScore((s) => s + 1500);
      setSolveModalOpen(false);
      setIsGameOver(true);
      sounds.playFanfare();
      triggerGrandConfetti();
    } else {
      sounds.playWrong();
      setSolveError(`«${cleanInput}» բառը սխալ է: Փորձեք կրկին կամ շարունակեք բացել տառերը:`);
    }
  };

  // Restart game
  const handleRestart = () => {
    sounds.playClick();
    setCurrentIdx(0);
    setRevealedLetters(new Set());
    setGuessedLetters(new Set());
    setAnswersState({});
    setCanPickLetter(false);
    setPendingLetterPicks(0);
    setScore(0);
    setIsGameOver(false);
    setWheelBonusMsg(null);
    setSolveError(null);
    setSolveWordInput('');
  };

  const getCategoryIcon = (cat: Question['category']) => {
    switch (cat) {
      case 'calle':
        return <Compass className="w-5 h-5 text-amber-400" />;
      case 'restaurante':
        return <UtensilsCrossed className="w-5 h-5 text-rose-400" />;
      case 'futbol':
        return <SoccerIcon className="w-5 h-5 text-emerald-400" />;
    }
  };

  const answeredCount = Object.keys(answersState).length;
  const correctCount = Object.values(answersState).filter((a) => a.isCorrect).length;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-amber-500 selection:text-black">
      {/* Top Navbar */}
      <header className="sticky top-0 z-40 bg-slate-900/90 backdrop-blur-md border-b border-amber-500/20 px-4 py-3 shadow-lg">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-600 via-yellow-500 to-amber-300 flex items-center justify-center text-slate-950 font-black shadow-md shadow-amber-500/30">
              <Sparkles className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-game font-black text-amber-400 text-lg tracking-wide uppercase">
                  Campo de las Maravillas
                </span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30 hidden sm:inline-block">
                  Поле Чудес
                </span>
              </div>
              <p className="text-xs text-slate-400 font-hy">
                Իսպաներեն–հայերեն խաղ (A1–A2) • Գուշակիր գլխավոր բառը
              </p>
            </div>
          </div>

          {/* Quick Actions & Score */}
          <div className="flex items-center gap-2 sm:gap-4">
            <div className="flex items-center gap-2 bg-slate-800/80 border border-slate-700 rounded-xl px-3 py-1.5 shadow-inner">
              <Award className="w-4 h-4 text-amber-400" />
              <span className="text-xs text-slate-400 hidden sm:inline">Միավոր՝</span>
              <span className="font-mono font-bold text-amber-300 text-sm sm:text-base">
                {score}
              </span>
            </div>

            <button
              onClick={() => setAutoShowTranslations(!autoShowTranslations)}
              title={autoShowTranslations ? 'Անջատել բոլոր թարգմանությունները' : 'Միշտ ցույց տալ հայերեն թարգմանությունները'}
              className={`p-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all border ${
                autoShowTranslations
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                  : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
              }`}
            >
              {autoShowTranslations ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
              <span className="hidden md:inline font-hy">
                {autoShowTranslations ? 'Հայերենը բաց է' : 'Թարգմանություն ըստ սեղմման'}
              </span>
            </button>

            <button
              onClick={toggleSound}
              title={soundEnabled ? 'Ձայնն անջատել' : 'Ձայնը միացնել'}
              className="p-2 rounded-xl bg-slate-800 border border-slate-700 hover:bg-slate-700 text-slate-300 transition-colors"
            >
              {soundEnabled ? <Volume2 className="w-4 h-4 text-emerald-400" /> : <VolumeX className="w-4 h-4 text-slate-500" />}
            </button>

            <button
              onClick={() => setVocabularyReviewOpen(true)}
              title="20 հարցերի բառարան"
              className="p-2 rounded-xl bg-slate-800 border border-slate-700 hover:bg-slate-700 text-slate-300 transition-colors flex items-center gap-1 text-xs"
            >
              <BookOpen className="w-4 h-4 text-cyan-400" />
              <span className="hidden lg:inline font-hy">Բառարան</span>
            </button>

            <button
              onClick={handleRestart}
              title="Վերսկսել խաղը"
              className="p-2 rounded-xl bg-slate-800 border border-slate-700 hover:bg-rose-950/40 hover:text-rose-300 text-slate-400 transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-6xl mx-auto w-full px-4 py-6 flex-1 flex flex-col gap-6">
        {/* Banner with Hint & Interaction note */}
        <div className="bg-gradient-to-r from-amber-900/30 via-slate-900/80 to-sky-950/40 border border-amber-500/30 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-lg">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-amber-500/20 text-amber-400 mt-0.5">
              <HelpCircle className="w-5 h-5 shrink-0" />
            </div>
            <div>
              <p className="text-sm font-medium text-amber-200">
                💡 <span className="font-bold">Կանոններ՝</span> Յուրաքանչյուր իսպաներեն տեքստի վրա սեղմելիս բացվում է հայերեն թարգմանությունը:
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
            <button
              onClick={() => setSolveModalOpen(true)}
              className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-bold text-xs shadow-md shadow-amber-500/20 transition-all flex items-center gap-1.5 font-hy"
            >
              <Star className="w-3.5 h-3.5 fill-slate-950" />
              Անվանել ամբողջ բառը
            </button>
          </div>
        </div>

        {/* 🌟 MARCADOR Mystery Word Board (Поле Чудес style letter boxes) */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-b from-slate-900 via-indigo-950 to-slate-900 border-2 border-amber-500/40 p-5 sm:p-7 shadow-2xl gold-glow">
          {/* Background stadium decorative glows */}
          <div className="absolute -top-12 -left-12 w-48 h-48 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-12 -right-12 w-48 h-48 bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 flex flex-col items-center text-center">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-400/30 text-amber-300 text-xs font-semibold mb-3">
              <Sparkles className="w-3.5 h-3.5" />
              <span>ՀԱՐՑԱՇԱՐԻ ԳԼԽԱՎՈՐ ԲԱՌԸ (8 ՏԱՌ)</span>
            </div>

            <p className="text-xs text-slate-400 mb-6 font-hy">
              Ճիշտ պատասխանելուց հետո ներքևի այբուբենից ընտրեք տառեր: Կարող եք նաև պտտել բարաբանը!
            </p>

            {/* Letter Slots */}
            <div className="flex flex-wrap justify-center gap-2 sm:gap-3.5 my-2">
              {targetLetters.map((char, index) => {
                const isRevealed = revealedLetters.has(char);
                return (
                  <div
                    key={index}
                    className="flex flex-col items-center"
                  >
                    <div
                      className={`w-11 h-14 sm:w-16 sm:h-20 rounded-2xl flex items-center justify-center font-black text-xl sm:text-3xl transition-all duration-500 select-none shadow-lg perspective-1000 ${
                        isRevealed
                          ? 'bg-gradient-to-b from-amber-300 via-yellow-400 to-amber-600 text-slate-950 border-2 border-amber-200 shadow-amber-500/40 scale-105 rotate-0'
                          : 'bg-slate-900 border-2 border-amber-500/40 text-amber-500/40 shadow-inner hover:border-amber-400'
                      }`}
                    >
                      {isRevealed ? (
                        <span className="drop-shadow-sm font-mono tracking-wider animate-bounce-short">
                          {char}
                        </span>
                      ) : (
                        <span className="text-slate-600 font-mono text-lg sm:text-2xl font-bold">
                          ?
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] text-slate-500 mt-1 font-mono font-medium">
                      #{index + 1}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Status & Unlocked Letter Picks notice */}
            <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
              <div className="px-3.5 py-1.5 rounded-xl bg-slate-800/80 border border-slate-700 text-xs text-slate-300 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                <span className="font-hy">
                  Բացված է՝ <strong className="text-amber-300">{revealedLetters.size}</strong> / {uniqueTargetLetters.length} եզակի տառ
                </span>
              </div>

              {pendingLetterPicks > 0 && (
                <div className="px-3.5 py-1.5 rounded-xl bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 text-xs font-bold animate-pulse flex items-center gap-1.5 font-hy">
                  <Sparkles className="w-3.5 h-3.5" />
                  Ունեք {pendingLetterPicks} տառ ընտրելու իրավունք! Ընտրեք ներքևից:
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Two Column Layout: Question Card (Left/Main) + Wheel/Stats (Right) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Main Question Section (8 cols on lg) */}
          <div className="lg:col-span-8 flex flex-col gap-4">
            {/* Category & Step Header */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-md flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-slate-800 border border-slate-700">
                  {getCategoryIcon(currentQ.category)}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-amber-400">
                      {currentQ.categoryLabelEs}
                    </span>
                    <span className="text-slate-500">•</span>
                    <span className="text-xs font-medium text-slate-300 font-hy">
                      {currentQ.categoryLabelHy}
                    </span>
                  </div>
                  <h3 className="text-sm font-semibold text-slate-200 font-hy">
                    Հարց {currentQ.id} / {totalQuestions}
                  </h3>
                </div>
              </div>

              {/* Navigation Arrows */}
              <div className="flex items-center gap-1.5">
                <button
                  disabled={currentIdx === 0}
                  onClick={() => {
                    sounds.playClick();
                    setCurrentIdx((i) => Math.max(0, i - 1));
                  }}
                  className="p-2 rounded-xl bg-slate-800 border border-slate-700 hover:bg-slate-700 disabled:opacity-30 disabled:hover:bg-slate-800 text-slate-300 transition-colors"
                  title="Նախորդ հարցը"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
                <div className="px-2.5 py-1 rounded-xl bg-slate-950 font-mono text-xs text-amber-300 border border-slate-800">
                  {currentIdx + 1} / {totalQuestions}
                </div>
                <button
                  disabled={currentIdx === totalQuestions - 1}
                  onClick={() => {
                    sounds.playClick();
                    setCurrentIdx((i) => Math.min(totalQuestions - 1, i + 1));
                  }}
                  className="p-2 rounded-xl bg-slate-800 border border-slate-700 hover:bg-slate-700 disabled:opacity-30 disabled:hover:bg-slate-800 text-slate-300 transition-colors"
                  title="Հաջորդ հարցը"
                >
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Question Card */}
            <div className="bg-gradient-to-b from-slate-900 to-slate-900/90 border border-slate-800 rounded-3xl p-5 sm:p-7 shadow-xl">
              {/* Question Text in Spanish (Clickable to reveal Armenian) */}
              <div className="mb-6">
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="text-xs text-slate-400 font-medium flex items-center gap-1">
                    🇪🇸 Իսպաներեն հարց (սեղմեք լսելու կամ թարգմանությունը տեսնելու համար)
                  </span>
                  <button
                    onClick={() => sounds.speakSpanish(currentQ.questionEs)}
                    title="Լսել իսպաներեն արտասանությունը"
                    className="p-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 transition-colors flex items-center gap-1 text-xs"
                  >
                    <Volume2 className="w-3.5 h-3.5" />
                    <span>Լսել</span>
                  </button>
                </div>

                <div
                  onClick={() => toggleTranslation(`q-${currentQ.id}`)}
                  className="cursor-pointer group bg-slate-950/80 hover:bg-slate-950 border border-slate-800 hover:border-amber-500/50 rounded-2xl p-4 transition-all duration-200"
                >
                  <p className="text-lg sm:text-xl font-bold text-slate-100 group-hover:text-amber-300 transition-colors flex items-start justify-between gap-3">
                    <span>{currentQ.questionEs}</span>
                    <span className="text-xs text-slate-500 group-hover:text-amber-400 shrink-0 mt-1 flex items-center gap-1">
                      {isVisible(`q-${currentQ.id}`) ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </span>
                  </p>

                  {/* Armenian translation toggle */}
                  {isVisible(`q-${currentQ.id}`) && (
                    <div className="mt-3 pt-3 border-t border-slate-800/80 text-sm font-hy font-semibold text-amber-300 flex items-center gap-2 animate-fadeIn">
                      <span className="text-xs px-2 py-0.5 rounded bg-amber-500/20 text-amber-200 font-bold shrink-0">
                        🇦🇲 Հայերեն
                      </span>
                      <span>{currentQ.questionHy}</span>
                    </div>
                  )}

                  {!isVisible(`q-${currentQ.id}`) && (
                    <p className="text-[11px] text-slate-500 mt-2 font-hy flex items-center gap-1">
                      👆 Սեղմեք այստեղ՝ հայերեն թարգմանությունը դիտելու համար
                    </p>
                  )}
                </div>
              </div>

              {/* Options List */}
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between text-xs text-slate-400 mb-1 font-hy">
                  <span>Ընտրեք ճիշտ տարբերակը.</span>
                  <span>(Սեղմեք աչքի կամ տարբերակի վրա՝ թարգմանությունը տեսնելու համար)</span>
                </div>

                {currentQ.options.map((opt: OptionItem) => {
                  const isSelected = currentAnswer?.selected === opt.key;
                  const isCorrectAnswer = opt.key === currentQ.correct;
                  const showTranslation = isVisible(`opt-${currentQ.id}-${opt.key}`);

                  let cardStyle =
                    'bg-slate-950/70 border-slate-800 hover:border-slate-700 text-slate-200 hover:bg-slate-800/40';
                  let badgeStyle = 'bg-slate-800 text-slate-300 border-slate-700';

                  if (isSelected) {
                    if (currentAnswer.isCorrect) {
                      cardStyle =
                        'bg-emerald-950/40 border-emerald-500/80 text-emerald-100 shadow-md shadow-emerald-900/30';
                      badgeStyle = 'bg-emerald-500 text-slate-950 border-emerald-400 font-black';
                    } else {
                      cardStyle =
                        'bg-rose-950/40 border-rose-500/80 text-rose-100 shadow-md shadow-rose-900/30';
                      badgeStyle = 'bg-rose-500 text-white border-rose-400 font-black';
                    }
                  } else if (currentAnswer && !currentAnswer.isCorrect && isCorrectAnswer) {
                    // Show correct answer hint so player learns
                    cardStyle =
                      'bg-emerald-950/20 border-emerald-500/40 text-emerald-200 border-dashed';
                  }

                  return (
                    <div
                      key={opt.key}
                      className={`relative border rounded-2xl p-3.5 sm:p-4 transition-all duration-200 flex flex-col gap-2 ${cardStyle}`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        {/* Option Click to Answer */}
                        <button
                          onClick={() => handleSelectOption(opt.key)}
                          className="flex items-center gap-3 flex-1 text-left"
                        >
                          <span
                            className={`w-8 h-8 rounded-xl border flex items-center justify-center font-bold text-sm shrink-0 transition-transform ${badgeStyle}`}
                          >
                            {opt.key}
                          </span>
                          <span className="font-semibold text-sm sm:text-base tracking-wide">
                            {opt.textEs}
                          </span>
                        </button>

                        {/* Speech & Translation icons */}
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              sounds.speakSpanish(opt.textEs);
                            }}
                            title="Արտասանել"
                            className="p-1.5 rounded-lg hover:bg-slate-700/60 text-slate-400 hover:text-amber-300 transition-colors"
                          >
                            <Volume2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleTranslation(`opt-${currentQ.id}-${opt.key}`);
                            }}
                            title={showTranslation ? 'Թաքցնել' : 'Տեսնել հայերեն'}
                            className={`p-1.5 rounded-lg transition-colors ${
                              showTranslation
                                ? 'bg-amber-500/20 text-amber-300'
                                : 'hover:bg-slate-700/60 text-slate-400 hover:text-slate-200'
                            }`}
                          >
                            {showTranslation ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>

                      {/* Revealed Armenian Translation */}
                      {showTranslation && (
                        <div className="mt-1 pt-2 border-t border-slate-800/80 text-xs sm:text-sm text-amber-300/90 font-hy flex items-center gap-1.5 animate-fadeIn pl-11">
                          <span className="font-medium">🇦🇲 {opt.textHy}</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Feedback and Continue Section */}
              {currentAnswer && (
                <div
                  className={`mt-6 p-4 rounded-2xl border transition-all animate-fadeIn ${
                    currentAnswer.isCorrect
                      ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-200'
                      : 'bg-amber-950/30 border-amber-500/40 text-amber-200'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {currentAnswer.isCorrect ? (
                      <CheckCircle2 className="w-6 h-6 text-emerald-400 shrink-0 mt-0.5" />
                    ) : (
                      <XCircle className="w-6 h-6 text-amber-400 shrink-0 mt-0.5" />
                    )}
                    <div className="flex-1 font-hy">
                      <p className="font-bold text-sm sm:text-base">
                        {currentAnswer.isCorrect
                          ? '¡Excelente! Ճիշտ պատասխան:'
                          : 'Սխալ պատասխան, բայց խաղը շարունակվում է!'}
                      </p>
                      <p className="text-xs sm:text-sm text-slate-300 mt-1">
                        {currentQ.explanationHy}
                      </p>

                      <div className="mt-3 flex flex-wrap items-center gap-2.5">
                        {currentAnswer.isCorrect ? (
                          <div className="text-xs font-bold text-emerald-300 bg-emerald-500/20 px-3 py-1.5 rounded-xl border border-emerald-500/30 inline-flex items-center gap-1.5">
                            <Sparkles className="w-4 h-4" />
                            Այժմ ընտրեք տառ ներքևի այբուբենից!
                          </div>
                        ) : (
                          <span className="text-xs text-amber-300/90">
                            Կարող եք կրկին փորձել կամ անցնել հաջորդ հարցին:
                          </span>
                        )}

                        {currentIdx < totalQuestions - 1 && (
                          <button
                            onClick={() => {
                              sounds.playClick();
                              setCurrentIdx((i) => i + 1);
                            }}
                            className="ml-auto px-4 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-100 font-semibold text-xs border border-slate-700 transition-colors flex items-center gap-1"
                          >
                            <span>Հաջորդ հարցը</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* 🔤 Spanish Alphabet Letter Picker */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
                <div>
                  <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2 font-hy">
                    <Sparkles className="w-4 h-4 text-amber-400" />
                    <span>Իսպաներեն այբուբեն — Ընտրեք տառ</span>
                  </h3>
                  <p className="text-xs text-slate-400 font-hy">
                    {canPickLetter || pendingLetterPicks > 0
                      ? '✨ Ունեք տառ ընտրելու իրավունք: Գտեք MARCADOR բառի տառերը!'
                      : 'Ճիշտ պատասխանեք հարցին կամ պտտեք բարաբանը՝ տառ ընտրելու համար:'}
                  </p>
                </div>

                {pendingLetterPicks > 0 && (
                  <span className="self-start sm:self-auto px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-300 text-xs font-bold border border-amber-500/30">
                    Հասանելի քայլեր՝ {pendingLetterPicks}
                  </span>
                )}
              </div>

              {/* Alphabet Buttons Grid */}
              <div className="grid grid-cols-7 sm:grid-cols-9 md:grid-cols-10 gap-1.5 sm:gap-2">
                {SPANISH_ALPHABET.map((char) => {
                  const isGuessed = guessedLetters.has(char);
                  const isInTarget = targetLetters.includes(char);
                  const isHit = isGuessed && isInTarget;
                  const isMiss = isGuessed && !isInTarget;

                  let btnStyle =
                    'bg-slate-800 text-slate-200 border-slate-700 hover:bg-slate-700 hover:border-amber-400/50';

                  if (isHit) {
                    btnStyle =
                      'bg-gradient-to-b from-amber-400 to-yellow-500 text-slate-950 font-black border-amber-300 shadow-md shadow-amber-500/20 scale-105';
                  } else if (isMiss) {
                    btnStyle = 'bg-slate-900/60 text-slate-600 border-slate-800 line-through opacity-50';
                  } else if (canPickLetter || pendingLetterPicks > 0) {
                    btnStyle =
                      'bg-slate-800 text-amber-300 border-amber-500/40 hover:bg-amber-500/20 hover:scale-105';
                  }

                  return (
                    <button
                      key={char}
                      disabled={isGuessed}
                      onClick={() => handlePickLetter(char)}
                      className={`h-10 sm:h-11 rounded-xl font-mono font-bold text-sm sm:text-base border transition-all duration-150 flex items-center justify-center ${btnStyle}`}
                      title={
                        isHit
                          ? `«${char}» տառը կա բառի մեջ!`
                          : isMiss
                          ? `«${char}» տառը չկա բառի մեջ`
                          : `Ընտրել «${char}» տառը`
                      }
                    >
                      {char}
                    </button>
                  );
                })}
              </div>

              {/* Letter stats note */}
              <div className="mt-4 pt-3 border-t border-slate-800/80 flex flex-wrap items-center justify-between text-xs text-slate-400 font-hy">
                <span>
                  Գտնված տառեր՝{' '}
                  <strong className="text-amber-300">{revealedLetters.size}</strong> /{' '}
                  {uniqueTargetLetters.length}
                </span>
                <span>
                  Փորձված տառեր՝ <strong className="text-slate-200">{guessedLetters.size}</strong> /{' '}
                  {SPANISH_ALPHABET.length}
                </span>
              </div>
            </div>
          </div>

          {/* Sidebar: Drum / Wheel of Fortune & Questions Grid (4 cols on lg) */}
          <div className="lg:col-span-4 flex flex-col gap-6">
            {/* 🎡 "Поле Чудес" Drum / Wheel Widget */}
            <div className="bg-gradient-to-b from-slate-900 via-indigo-950 to-slate-900 border border-amber-500/30 rounded-3xl p-5 shadow-xl flex flex-col items-center text-center">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-amber-400 mb-1">
                <Sparkles className="w-4 h-4" />
                <span>Հրաշքների դաշտ • Բարաբան</span>
              </div>
              <h4 className="text-base font-bold text-slate-100 font-hy mb-3">
                Կրուտիտե բարաբանը!
              </h4>

              {/* Wheel Graphic */}
              <div className="relative my-2 w-48 h-48 sm:w-52 sm:h-52">
                {/* Wheel Pointer */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-2 z-20 w-0 h-0 border-l-[12px] border-l-transparent border-r-[12px] border-r-transparent border-t-[20px] border-t-amber-400 drop-shadow-md" />

                <div
                  ref={wheelRef}
                  style={{
                    transform: `rotate(${wheelRotation}deg)`,
                    transition: isSpinning ? 'transform 3.2s cubic-bezier(0.15, 0.95, 0.35, 1)' : 'none',
                  }}
                  className="w-full h-full rounded-full border-4 border-amber-400 shadow-2xl relative overflow-hidden bg-slate-900"
                >
                  {/* Wheel Sectors via SVG */}
                  <svg viewBox="0 0 100 100" className="w-full h-full">
                    {/* 6 colored slices */}
                    <path d="M 50 50 L 50 0 A 50 50 0 0 1 93.3 25 Z" fill="#f59e0b" />
                    <path d="M 50 50 L 93.3 25 A 50 50 0 0 1 93.3 75 Z" fill="#0284c7" />
                    <path d="M 50 50 L 93.3 75 A 50 50 0 0 1 50 100 Z" fill="#10b981" />
                    <path d="M 50 50 L 50 100 A 50 50 0 0 1 6.7 75 Z" fill="#8b5cf6" />
                    <path d="M 50 50 L 6.7 75 A 50 50 0 0 1 6.7 25 Z" fill="#ef4444" />
                    <path d="M 50 50 L 6.7 25 A 50 50 0 0 1 50 0 Z" fill="#eab308" />

                    {/* Central Golden Hub */}
                    <circle cx="50" cy="50" r="14" fill="#1e1b4b" stroke="#fcd34d" strokeWidth="2.5" />
                    <circle cx="50" cy="50" r="5" fill="#f59e0b" />
                  </svg>
                </div>
              </div>

              {/* Bonus Message */}
              {wheelBonusMsg && (
                <div className="my-2 p-2.5 rounded-xl bg-amber-500/20 border border-amber-400/40 text-amber-200 text-xs font-semibold font-hy animate-fadeIn">
                  {wheelBonusMsg}
                </div>
              )}

              {/* Spin Button */}
              <button
                disabled={isSpinning}
                onClick={spinWheel}
                className="mt-2 w-full py-2.5 rounded-xl bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 hover:from-amber-400 hover:to-yellow-300 disabled:opacity-50 text-slate-950 font-black text-sm uppercase tracking-wider shadow-lg shadow-amber-500/25 transition-all flex items-center justify-center gap-2 font-game"
              >
                <Play className={`w-4 h-4 fill-slate-950 ${isSpinning ? 'animate-spin' : ''}`} />
                <span>{isSpinning ? 'Պտտվում է...' : 'Պտտել բարաբանը'}</span>
              </button>
            </div>

            {/* 📋 20 Questions Tracker Grid */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl">
              <div className="flex items-center justify-between gap-2 mb-3">
                <h4 className="text-sm font-bold text-slate-200 font-hy flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>20 Հարցերի քարտեզ</span>
                </h4>
                <span className="text-xs font-mono font-semibold text-slate-400">
                  {answeredCount} / {totalQuestions}
                </span>
              </div>

              <div className="grid grid-cols-5 gap-2">
                {QUESTIONS_DATA.map((q, idx) => {
                  const ans = answersState[q.id];
                  const isCurrent = idx === currentIdx;

                  let tileStyle = 'bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700';

                  if (isCurrent) {
                    tileStyle = 'bg-amber-500 text-slate-950 font-black border-amber-300 ring-2 ring-amber-400/50';
                  } else if (ans?.isCorrect) {
                    tileStyle = 'bg-emerald-900/60 text-emerald-300 border-emerald-500/60 font-bold';
                  } else if (ans && !ans.isCorrect) {
                    tileStyle = 'bg-rose-950/60 text-rose-300 border-rose-500/60';
                  }

                  return (
                    <button
                      key={q.id}
                      onClick={() => {
                        sounds.playClick();
                        setCurrentIdx(idx);
                      }}
                      className={`h-9 rounded-xl text-xs font-mono border transition-all flex items-center justify-center relative ${tileStyle}`}
                      title={`Հարց ${q.id}: ${q.categoryLabelEs}`}
                    >
                      {q.id}
                      {ans?.isCorrect && (
                        <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-emerald-400 border border-slate-950" />
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Legend */}
              <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400 font-hy">
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Ճիշտ ({correctCount})
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500" /> Սխալ ({answeredCount - correctCount})
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-slate-700" /> Չպատասխանած ({totalQuestions - answeredCount})
                </span>
              </div>
            </div>

            {/* Quick Vocabulary Preview Button */}
            <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-4 text-center">
              <p className="text-xs text-slate-400 font-hy mb-2">
                Ցանկանո՞ւմ եք ուսումնասիրել բոլոր 20 արտահայտությունների բառարանը:
              </p>
              <button
                onClick={() => setVocabularyReviewOpen(true)}
                className="w-full py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 font-bold text-xs border border-slate-700 transition-colors flex items-center justify-center gap-2 font-hy"
              >
                <BookOpen className="w-4 h-4" />
                <span>Բացել 20 հարցերի բառարանը</span>
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* Modal: Solve the Whole Word Directly */}
      {solveModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-slate-900 border-2 border-amber-500/60 rounded-3xl max-w-md w-full p-6 shadow-2xl relative">
            <button
              onClick={() => setSolveModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg"
            >
              ✕
            </button>

            <div className="text-center">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center mx-auto mb-3">
                <Trophy className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-100 font-hy">
                Անվանե՛ք ամբողջ բառը
              </h3>
              <p className="text-xs text-slate-400 mt-1 font-hy">
                Եթե արդեն գիտեք հիմնական 8-տառանոց բառը, գրեք այստեղ՝
              </p>

              <form onSubmit={handleSolveWordSubmit} className="mt-5 flex flex-col gap-3">
                <input
                  type="text"
                  maxLength={12}
                  value={solveWordInput}
                  onChange={(e) => {
                    setSolveWordInput(e.target.value.toUpperCase());
                    setSolveError(null);
                  }}
                  placeholder="MARCADOR"
                  className="w-full px-4 py-3 rounded-2xl bg-slate-950 border border-amber-500/40 text-center font-mono font-black text-xl tracking-widest text-amber-300 focus:outline-none focus:border-amber-400"
                  autoFocus
                />

                {solveError && (
                  <p className="text-xs text-rose-400 font-hy">{solveError}</p>
                )}

                <div className="flex gap-2 mt-2">
                  <button
                    type="button"
                    onClick={() => setSolveModalOpen(false)}
                    className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition-colors font-hy"
                  >
                    Չեղարկել
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-black text-xs transition-all shadow-md font-hy"
                  >
                    Հաստատել
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Full 20 Questions Vocabulary & Study Guide */}
      {vocabularyReviewOpen && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-3xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950">
              <div className="flex items-center gap-2.5">
                <BookOpen className="w-5 h-5 text-amber-400" />
                <div>
                  <h3 className="font-bold text-slate-100 text-base font-hy">
                    20 Արտահայտությունների բառարան
                  </h3>
                  <p className="text-xs text-slate-400">
                    Ճանապարհ (La Calle), Ռեստորան (El Restaurante), Ֆուտբոլ (El Fútbol)
                  </p>
                </div>
              </div>
              <button
                onClick={() => setVocabularyReviewOpen(false)}
                className="text-slate-400 hover:text-white p-2 rounded-xl bg-slate-800 hover:bg-slate-700 transition-colors"
              >
                ✕
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex flex-col gap-4">
              {QUESTIONS_DATA.map((q) => (
                <div
                  key={q.id}
                  className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 flex flex-col gap-2"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold text-amber-400">
                      #{q.id} • {q.categoryEmoji} {q.categoryLabelEs} ({q.categoryLabelHy})
                    </span>
                    <button
                      onClick={() => sounds.speakSpanish(q.questionEs)}
                      title="Լսել"
                      className="text-slate-400 hover:text-amber-300 p-1"
                    >
                      <Volume2 className="w-4 h-4" />
                    </button>
                  </div>

                  <p className="font-semibold text-slate-200 text-sm">
                    {q.questionEs}
                  </p>
                  <p className="text-xs text-amber-300 font-hy">
                    🇦🇲 {q.questionHy}
                  </p>

                  <div className="mt-1 pt-2 border-t border-slate-800/80 flex flex-col gap-1 text-xs">
                    <span className="text-slate-400 font-hy">Ճիշտ պատասխան՝</span>
                    {q.options
                      .filter((o) => o.key === q.correct)
                      .map((co) => (
                        <div
                          key={co.key}
                          className="flex items-center justify-between gap-2 bg-emerald-950/40 border border-emerald-500/30 p-2 rounded-xl text-emerald-200"
                        >
                          <span className="font-bold">
                            {co.key}) {co.textEs}
                          </span>
                          <span className="font-hy text-emerald-300">
                            {co.textHy}
                          </span>
                        </div>
                      ))}
                  </div>
                </div>
              ))}
            </div>

            <div className="p-4 border-t border-slate-800 bg-slate-950 flex justify-end">
              <button
                onClick={() => setVocabularyReviewOpen(false)}
                className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs font-hy"
              >
                Փակել
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Grand Victory Game Over */}
      {isGameOver && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-gradient-to-b from-slate-900 via-indigo-950 to-slate-900 border-2 border-amber-400 rounded-3xl max-w-lg w-full p-6 sm:p-8 text-center shadow-2xl relative gold-glow">
            <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-amber-500 to-yellow-300 text-slate-950 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-amber-500/30">
              <Trophy className="w-9 h-9" />
            </div>

            <h2 className="font-game text-2xl sm:text-3xl font-black text-amber-300 uppercase tracking-wide">
              ¡FELICITACIONES!
            </h2>
            <h3 className="text-base sm:text-lg font-bold text-slate-100 font-hy mt-1">
              Շնորհավորո՜ւմ ենք: Դուք գուշակեցիք բառը:
            </h3>

            {/* Revealed target word */}
            <div className="my-5 p-4 rounded-2xl bg-slate-950 border border-amber-500/40">
              <span className="text-xs text-slate-400 font-hy block mb-1">
                Գլխավոր բառը՝
              </span>
              <div className="flex justify-center gap-1.5 sm:gap-2">
                {targetLetters.map((l, i) => (
                  <span
                    key={i}
                    className="w-9 h-11 sm:w-11 sm:h-14 rounded-xl bg-gradient-to-b from-amber-400 to-yellow-500 text-slate-950 font-mono font-black text-lg sm:text-2xl flex items-center justify-center shadow-md"
                  >
                    {l}
                  </span>
                ))}
              </div>
              <p className="text-xs text-amber-300 mt-2 font-hy">
                <strong>MARCADOR</strong> — Հաշվատախտակ (սպորտում), մարկեր
              </p>
            </div>

            {/* Final Stats */}
            <div className="grid grid-cols-3 gap-2 my-4 text-xs font-hy">
              <div className="p-3 rounded-xl bg-slate-800/80 border border-slate-700">
                <span className="text-slate-400 block">Վերջնական միավոր</span>
                <span className="text-lg font-bold font-mono text-amber-300">{score}</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-800/80 border border-slate-700">
                <span className="text-slate-400 block">Ճիշտ պատասխաններ</span>
                <span className="text-lg font-bold font-mono text-emerald-300">
                  {correctCount} / {totalQuestions}
                </span>
              </div>
              <div className="p-3 rounded-xl bg-slate-800/80 border border-slate-700">
                <span className="text-slate-400 block">Բացված տառեր</span>
                <span className="text-lg font-bold font-mono text-sky-300">
                  {uniqueTargetLetters.length} / {uniqueTargetLetters.length}
                </span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-2 mt-6">
              <button
                onClick={() => setVocabularyReviewOpen(true)}
                className="flex-1 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs border border-slate-700 transition-colors font-hy"
              >
                Դիտել 20 հարցերի բառարանը
              </button>
              <button
                onClick={handleRestart}
                className="flex-1 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-slate-950 font-black text-xs uppercase tracking-wider transition-all shadow-md font-game"
              >
                Խաղալ նորից
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="mt-auto border-t border-slate-900 bg-slate-950/80 px-4 py-4 text-center text-xs text-slate-500 font-hy">
        <p>
          Campo de las Maravillas (Поле Чудес) • 20 preguntas (A1–A2) — La calle, el restaurante y el fútbol
        </p>
      </footer>
    </div>
  );
}
