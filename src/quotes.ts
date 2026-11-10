// Public-domain quotations only, chosen for meaning and matched to the day's state.
// Excerpts are exact (trimmed at clause boundaries); "\n" marks verse line breaks.
export type QuoteKey = 'resistance' | 'resistanceDone' | 'cardio' | 'cardioDone' | 'rest' | 'overdue' | 'firstDay';
export interface Quote { text: string; author: string; work: string }
const Q = (text: string, author: string, work: string): Quote => ({ text, author, work });

const POOLS: Record<QuoteKey, Quote[]> = {
  resistance: [
    Q('In the morning when thou risest unwillingly, let this thought be present—I am rising to the work of a human being.', 'Marcus Aurelius', 'Meditations 5.1, tr. George Long'),
    Q('In every act observe the things which come first, and those which follow it; and so proceed to the act.', 'Epictetus', 'Enchiridion 29, tr. George Long'),
    Q('Whatsoever thy hand findeth to do, do it with thy might.', 'Ecclesiastes', '9:10, King James Bible'),
    Q('To affect the quality of the day, that is the highest of arts.', 'Henry David Thoreau', 'Walden'),
    Q('We become just by doing just acts, temperate by doing temperate acts, brave by doing brave acts.', 'Aristotle', 'Nicomachean Ethics II.1, tr. W. D. Ross'),
  ],
  resistanceDone: [
    Q('To strive, to seek, to find, and not to yield.', 'Alfred, Lord Tennyson', 'Ulysses'),
    Q('The heights by great men reached and kept\nWere not attained by sudden flight,\nBut they, while their companions slept,\nWere toiling upward in the night.', 'Henry Wadsworth Longfellow', 'The Ladder of Saint Augustine'),
    Q('Henceforth I ask not good-fortune, I myself am good-fortune.', 'Walt Whitman', 'Song of the Open Road'),
    Q('Ah, but a man’s reach should exceed his grasp,\nOr what’s a heaven for?', 'Robert Browning', 'Andrea del Sarto'),
    Q('I am the master of my fate:\nI am the captain of my soul.', 'William Ernest Henley', 'Invictus'),
  ],
  cardio: [
    Q('Afoot and light-hearted I take to the open road,\nHealthy, free, the world before me.', 'Walt Whitman', 'Song of the Open Road'),
    Q('If you can fill the unforgiving minute\nWith sixty seconds’ worth of distance run', 'Rudyard Kipling', 'If—'),
    Q('Let us run with patience the race that is set before us.', 'Hebrews', '12:1, King James Bible'),
    Q('They shall run, and not be weary; and they shall walk, and not faint.', 'Isaiah', '40:31, King James Bible'),
    Q('I cannot preserve my health and spirits, unless I spend four hours a day at least … sauntering through the woods and over the hills and fields.', 'Henry David Thoreau', 'Walking'),
  ],
  cardioDone: [
    Q('But I have promises to keep,\nAnd miles to go before I sleep.', 'Robert Frost', 'Stopping by Woods on a Snowy Evening'),
    Q('Tho’ much is taken, much abides.', 'Alfred, Lord Tennyson', 'Ulysses'),
    Q('Nothing great was ever achieved without enthusiasm.', 'Ralph Waldo Emerson', 'Circles'),
    Q('To finish the moment, to find the journey’s end in every step of the road, to live the greatest number of good hours, is wisdom.', 'Ralph Waldo Emerson', 'Experience'),
    Q('Let us, then, be up and doing,\nWith a heart for any fate;\nStill achieving, still pursuing,\nLearn to labor and to wait.', 'Henry Wadsworth Longfellow', 'A Psalm of Life'),
  ],
  rest: [
    Q('To every thing there is a season, and a time to every purpose under the heaven.', 'Ecclesiastes', '3:1, King James Bible'),
    Q('It is vain for you to rise up early, to sit up late, to eat the bread of sorrows: for so he giveth his beloved sleep.', 'Psalm', '127:2, King James Bible'),
    Q('Sleep that knits up the ravell’d sleave of care,\nThe death of each day’s life, sore labour’s bath,\nBalm of hurt minds', 'William Shakespeare', 'Macbeth, II.ii'),
    Q('I loafe and invite my soul,\nI lean and loafe at my ease observing a spear of summer grass.', 'Walt Whitman', 'Song of Myself'),
    Q('Nothing can bring you peace but yourself.', 'Ralph Waldo Emerson', 'Self-Reliance'),
  ],
  overdue: [
    Q('Thou sufferest this justly: for thou choosest rather to become good to-morrow than to be good to-day.', 'Marcus Aurelius', 'Meditations 8.22, tr. George Long'),
    Q('While we are postponing, life speeds by.', 'Seneca', 'Letters 1, tr. R. M. Gummere'),
    Q('Forget them as fast as you can. Tomorrow is a new day. You shall begin it well and serenely, with too high a spirit to be cumbered with your old nonsense.', 'Ralph Waldo Emerson', 'Letter to Ellen Emerson, 8 April 1854 (punctuation modernized)'),
    Q('He that observeth the wind shall not sow; and he that regardeth the clouds shall not reap.', 'Ecclesiastes', '11:4, King James Bible'),
    Q('So teach us to number our days, that we may apply our hearts unto wisdom.', 'Psalm', '90:12, King James Bible'),
  ],
  firstDay: [
    Q('The journey of a thousand li commenced with a single step.', 'Laozi', 'Tao Te Ching 64, tr. James Legge'),
    Q('If one advances confidently in the direction of his dreams, and endeavors to live the life which he has imagined, he will meet with a success unexpected in common hours.', 'Henry David Thoreau', 'Walden'),
    Q('Our doubts are traitors,\nAnd make us lose the good we oft might win\nBy fearing to attempt.', 'William Shakespeare', 'Measure for Measure, I.iv'),
    Q('The path of the just is as the shining light, that shineth more and more unto the perfect day.', 'Proverbs', '4:18, King James Bible'),
    Q('In the morning sow thy seed, and in the evening withhold not thine hand.', 'Ecclesiastes', '11:6, King James Bible'),
  ],
};

const dayNum = (iso: string) => { const [y, m, d] = iso.split('-').map(Number); return Date.UTC(y, m - 1, d) / 86400000; };
/** Same quote all day; consecutive days walk the pool so nothing repeats until it is exhausted. */
export function quoteFor(key: QuoteKey, date: string): Quote {
  const pool = POOLS[key];
  let off = 0;
  for (const c of key) off += c.charCodeAt(0);
  return pool[(dayNum(date) + off) % pool.length];
}
