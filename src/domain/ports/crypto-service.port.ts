/**
 * Interface for Cryptographic Operations
 * Promotes Crypto-Agility by abstracting specific algorithms (e.g. bcrypt)
 */
export interface ICryptoService {
  /**
   * Hash a plaintext value (e.g. password)
   * @param plaintext Value to hash
   */
  hash(plaintext: string): Promise<string>;

  /**
   * Compare a plaintext value against a hash
   * @param plaintext Value to check
   * @param hash Stored hash
   */
  compare(plaintext: string, hash: string): Promise<boolean>;
}
