import crypto from 'crypto';
import { DisbursementItem } from './fetchContinuingDisbursements';

const RAW_SECRET_KEY =
  process.env.DISBURSEMENT_ENCRYPTION_KEY ||
  'da-car-rcpu-disbursement-privacy-key-2026-cordillera';

const SECRET_KEY = crypto.createHash('sha256').update(RAW_SECRET_KEY).digest();
const ALGO = 'aes-256-cbc';

// Patterns matching organizations, businesses, government agencies, hotels, coops, etc.
const ORG_REGEX =
  /\b(corp|corporation|inc|incorporated|llc|ltd|limited|coop|cooperative|mpc|association|assoc|enterprise|enterprises|trading|tarding|traders|trader|traderscorporation|marketing|supplies|supply|hardware|hotel|resort|inn|lodge|restaurant|resto|cafe|catering|caterer|services|service|construction|builders|builder|laboratories|laboratory|center|centre|commercial|mart|store|shop|station|farm|farms|agri|agro|industrial|agromarketing|agrimarketing|seeds|seed|fertilizer|fertilizers|biofertilizer|biofertilizers|equipment|machinery|chemical|chemicals|distribution|distributors|distributor|technologies|technology|tech|agency|foundation|university|college|institute|school|department|bureau|office|lgu|barangay|brgy|municipality|province|panciteria|bakeshop|bakery|merchandise|mdse|district|electric|telecom|pldt|smart|globe|dost|da|ati|nia|dpwh|solgen|landbank|dbpm|dbp|gsis|sss|bir|bank|security|automotive|motors|parts|gasoline|petron|shell|caltex|total|phoenix|oil|auto|travel & tours|tours)\b/i;

/**
 * Accurately determines if a payee represents an individual person (e.g. COS personnel,
 * honoraria recipient, employee) rather than an entity/business.
 */
export function isPersonPayee(payee: string, particulars: string = ''): boolean {
  if (!payee) return false;
  let clean = payee.replace(/^(ADJUST|CANCEL|ADJUS|ADJ|REIMB|REIMBURSEMENT)\s*:\s*/i, '').trim();

  // Explicit entity patterns and common typos in supplier registries
  if (/BATAC\s+AGRO/i.test(clean) || /TRADERSCORPORATION/i.test(clean)) {
    return false;
  }

  const hasEtAl = /\bet\.?\s*al\.?\b/i.test(clean);
  if (hasEtAl) clean = clean.replace(/,?\s*\bet\.?\s*al\.?\b/i, '').trim();

  const partUpper = (particulars || '').toUpperCase();
  const personParticularClues = [
    'COS FROM',
    'CONTRACT OF SERVICE',
    'SALARY',
    'HONORARIUM',
    'HONORARIA',
    'WAGES',
    'PER DIEM',
    'TEV OF',
    'TRAVEL EXPENSES OF',
    'TRAVELLING EXPENSES OF',
    'REIMBURSEMENT OF EXPENSES INCURRED BY',
    'CASH ADVANCE FOR',
  ];
  const hasPersonParticular = personParticularClues.some((clue) => partUpper.includes(clue));

  if (ORG_REGEX.test(clean)) {
    if (!hasPersonParticular) return false;
  }

  // Titles
  if (/^(ATTY|ENGR|DR|MR|MS|MRS)\.?\s+/i.test(clean)) return true;

  // Single word is generally not a person's full name
  const words = clean
    .split(/[\s,]+/)
    .filter((w) => w.length > 0 && !/^ET\.?$/i.test(w) && !/^AL\.?$/i.test(w));
  if (words.length < 2) return false;

  const hasMiddleInitial = words.some((w) => /^[A-Z]\.?$/i.test(w));
  const isAlphaName = words.every((w) => /^[A-Za-z.\-'\u00C0-\u024F]+$/.test(w));

  if (hasPersonParticular && isAlphaName) return true;
  if (hasMiddleInitial && isAlphaName && !ORG_REGEX.test(clean)) return true;
  if (hasEtAl && isAlphaName) return true;
  if (isAlphaName && words.length >= 2 && words.length <= 4 && !ORG_REGEX.test(clean)) return true;

  return false;
}

function maskSimpleWord(word: string): string {
  if (!word) return '';
  // Keep single initials like 'A.' or 'B.'
  if (/^[A-Za-z]\.?$/.test(word)) return word;
  // Keep professional honorifics
  if (/^(ATTY|ENGR|DR|MR|MS|MRS)\.?$/i.test(word)) return word;

  const trailMatch = word.match(/[,;:]+$/);
  const trailing = trailMatch ? trailMatch[0] : '';
  const core = trailing ? word.slice(0, -trailing.length) : word;

  if (core.length <= 2) return core[0] + '*' + trailing;
  return core[0] + '*'.repeat(Math.max(1, core.length - 2)) + core[core.length - 1] + trailing;
}

function maskWord(word: string): string {
  if (word.includes('-')) {
    return word.split('-').map(maskSimpleWord).join('-');
  }
  return maskSimpleWord(word);
}

/**
 * Masks a person's name for public presentation under RA 10173 (Data Privacy Act).
 * Preserves prefixes (ADJUST/CANCEL) and suffixes (ET. AL.) while redacting individual identity.
 */
export function maskPersonName(rawName: string): string {
  if (!rawName) return '';
  let prefix = '';
  let clean = rawName;
  const prefixMatch = clean.match(/^(ADJUST|CANCEL|ADJUS|ADJ|REIMB|REIMBURSEMENT)\s*:\s*/i);
  if (prefixMatch) {
    prefix = prefixMatch[0];
    clean = clean.slice(prefix.length).trim();
  }

  let suffix = '';
  const suffixMatch = clean.match(/,?\s*\bet\.?\s*al\.?\b/i);
  if (suffixMatch) {
    suffix = suffixMatch[0];
    clean = clean.slice(0, suffixMatch.index).trim();
  }

  const words = clean.split(/(\s+)/);
  const maskedWords = words.map((w) => {
    if (/^\s+$/.test(w)) return w;
    return maskWord(w);
  });

  return prefix + maskedWords.join('') + suffix;
}

/**
 * Sanitizes particulars text if the payee's name is cited in it.
 */
export function sanitizeParticulars(
  particulars: string | undefined,
  originalName: string,
  isPerson: boolean
): string | undefined {
  if (!particulars || !isPerson || !originalName) return particulars;

  let cleanName = originalName.replace(/^(ADJUST|CANCEL|ADJUS|ADJ|REIMB|REIMBURSEMENT)\s*:\s*/i, '').trim();
  cleanName = cleanName.replace(/,?\s*\bet\.?\s*al\.?\b/i, '').trim();

  if (cleanName.length < 3) return particulars;

  const escaped = cleanName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const masked = maskPersonName(cleanName);
  return particulars.replace(new RegExp(escaped, 'gi'), masked);
}

/**
 * Encrypts a personnel name using AES-256-CBC.
 */
export function encryptPersonnelName(name: string): string {
  if (!name) return '';
  try {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(ALGO, SECRET_KEY, iv);
    let enc = cipher.update(name, 'utf8', 'hex');
    enc += cipher.final('hex');
    return `enc:${iv.toString('hex')}:${enc}`;
  } catch (err) {
    console.error('Encryption error:', err);
    return name;
  }
}

/**
 * Decrypts an encrypted personnel name token back to plaintext.
 */
export function decryptPersonnelName(token: string): string {
  if (!token || !token.startsWith('enc:')) return token;
  try {
    const parts = token.split(':');
    if (parts.length !== 3) return token;
    const iv = Buffer.from(parts[1], 'hex');
    const enc = parts[2];
    const decipher = crypto.createDecipheriv(ALGO, SECRET_KEY, iv);
    let dec = decipher.update(enc, 'hex', 'utf8');
    dec += decipher.final('utf8');
    return dec;
  } catch (err) {
    console.error('Decryption error:', err);
    return token;
  }
}

/**
 * Applies privacy protection to disbursement records:
 * - If authenticated (signed in): reveals plaintext with isPerson flag and isEncrypted: false.
 * - If public (unauthenticated): encrypts and masks all individual person names under RA 10173.
 */
export function protectDisbursementRecords(
  records: DisbursementItem[],
  isAuthenticated: boolean
): DisbursementItem[] {
  return records.map((item) => {
    const isPerson = isPersonPayee(item.payee, item.particulars);
    if (!isPerson) {
      return {
        ...item,
        isPerson: false,
        isEncrypted: false,
      };
    }

    if (isAuthenticated) {
      return {
        ...item,
        isPerson: true,
        isEncrypted: false,
      };
    }

    // Public / Unauthenticated: encrypt and mask
    const originalPayee = item.payee;
    const encryptedToken = encryptPersonnelName(originalPayee);
    const maskedPayee = maskPersonName(originalPayee);
    const sanitizedPart = sanitizeParticulars(item.particulars, originalPayee, true);

    return {
      ...item,
      payee: maskedPayee,
      encryptedPayee: encryptedToken,
      particulars: sanitizedPart,
      isPerson: true,
      isEncrypted: true,
    };
  });
}
