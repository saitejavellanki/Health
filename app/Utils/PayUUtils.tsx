// PayUUtils.js for Expo React Native
import * as Crypto from 'expo-crypto';

/**
 * Generates a hash for PayU payment gateway authentication using Expo's crypto library
 * 
 * @param {string} input - The string to be hashed as per PayU requirements
 * @returns {Promise<string>} - The SHA512 hash in hexadecimal format
 */
export const generateHash = async (input) => {
  try {
    // Using Expo's crypto library to generate SHA512 hash
    const hash = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA512,
      input
    );
    return hash;
  } catch (error) {
    console.error('Error generating hash:', error);
    throw error;
  }
};

/**
 * Synchronous hash generation for PayU (fallback using string manipulation)
 * Use this only if you need a synchronous function and cannot use async/await
 * 
 * @param {string} input - The string to be hashed
 * @returns {string} - A simple hash representation (not for production)
 */
export const generateHashSync = (input) => {
  // This is a placeholder - for production, you must use the async version above
  // with proper crypto, or import a synchronous crypto library
  console.warn('Using synchronous hash is not secure for production!');
  
  // Basic string manipulation (NOT SECURE - only for development/testing)
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    const char = input.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  
  // Convert to hex-like string
  const hexHash = Math.abs(hash).toString(16).padStart(16, '0');
  return hexHash.repeat(8); // To make it similar in length to SHA512
};

/**
 * Utility function to prepare PayU parameters with the hash
 * 
 * @param {Object} params - Payment parameters
 * @param {string} salt - Merchant salt key
 * @returns {Promise<Object>} - Parameters with generated hash
 */
export const preparePayuParams = async (params, salt) => {
  const {
    key,
    txnid,
    amount,
    productinfo,
    firstname,
    email,
    ...otherParams
  } = params;
  
  // Construct hash string in the format required by PayU
  // Use empty strings for UDF fields not provided, exactly matching the working example
  const hashString = `${key}|${txnid}|${amount}|${productinfo}|${firstname}|${email}|||||||||||${salt}`;
  
  // Generate the hash
  const hash = await generateHash(hashString);
  
  // Return all params including the generated hash
  return {
    key,
    txnid,
    amount,
    productinfo,
    firstname,
    email,
    hash,
    ...otherParams
  };
};

/**
 * Verify PayU response hash
 * 
 * @param {Object} response - PayU response
 * @param {string} salt - Merchant salt
 * @returns {Promise<boolean>} - Whether the hash is valid
 */
export const verifyPayuHash = async (response, salt) => {
  const {
    status,
    firstname,
    email,
    amount,
    txnid,
    productinfo,
    hash,
    key,
    additionalCharges = ''
  } = response;
  
  let hashString = '';
  
  // For success transactions
  if (status === 'success') {
    // Include additionalCharges if present
    if (additionalCharges) {
      hashString = `${salt}|${status}|||||||||||${email}|${firstname}|${productinfo}|${amount}|${txnid}|${key}|${additionalCharges}`;
    } else {
      hashString = `${salt}|${status}|||||||||||${email}|${firstname}|${productinfo}|${amount}|${txnid}|${key}`;
    }
  } 
  // For failure transactions
  else {
    hashString = `${salt}|${status}|||||||||||${email}|${firstname}|${productinfo}|${amount}|${txnid}|${key}`;
  }
  
  // Generate the verification hash
  const calculatedHash = await generateHash(hashString);
  
  // Compare with the hash received from PayU
  return calculatedHash === hash;
};