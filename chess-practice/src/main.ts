import './style.css';
import { loadSavedGames } from './games';
import { startSession } from './session';
import { ensureSchema } from './storage';
import { nav, kv, state } from './ui/ctx';
import { viewLearn, viewLesson } from './ui/learn';
import { restoreAnalysis, viewAnalysis, viewImport, viewMistakes } from './ui/mistakes';
import { viewPractice } from './ui/practice';
import { viewRound } from './ui/round';

ensureSchema();
state.sessionNo = startSession(kv);

Object.assign(nav, {
  learn: viewLearn,
  lesson: viewLesson,
  mistakes: viewMistakes,
  importView: viewImport,
  analysis: viewAnalysis,
  round: viewRound,
  practice: viewPractice,
});

// Saved games and the last analysis for them come back after a restart, so the app works offline.
if (loadSavedGames() && state.games.length) restoreAnalysis();

// The default journey starts with a lesson, not a mistake or a puzzle.
viewLearn();
