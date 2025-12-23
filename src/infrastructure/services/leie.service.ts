import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';
import { parse } from 'csv-parse/sync';

/**
 * OIG LEIE (List of Excluded Individuals/Entities) Service
 *
 * Downloads and caches the federal exclusion list from:
 * https://oig.hhs.gov/exclusions/downloadables/
 *
 * The LEIE contains individuals/entities excluded from Medicare/Medicaid.
 * Healthcare organizations have an "affirmative duty" to check this list.
 */

export interface LeieRecord {
  lastName: string;
  firstName: string;
  middleName?: string;
  busName?: string; // Business name for entities
  general?: string;
  specialty?: string;
  upin?: string;
  npi?: string;
  dob?: string;
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
  exclType?: string;
  exclDate?: string;
  reinDate?: string;
  waiverDate?: string;
  waiverState?: string;
}

export interface LeieSearchResult {
  isExcluded: boolean;
  matches: LeieRecord[];
  checkedAt: Date;
  databaseDate: string | null;
}

@Injectable()
export class LeieService implements OnModuleInit {
  private readonly logger = new Logger(LeieService.name);

  // OIG LEIE download URL (Updated monthly)
  private readonly LEIE_DOWNLOAD_URL =
    'https://oig.hhs.gov/exclusions/downloadables/UPDATED.csv';

  // Local cache path
  private readonly CACHE_DIR = path.join(process.cwd(), '.cache', 'leie');
  private readonly CACHE_FILE = path.join(this.CACHE_DIR, 'leie.csv');
  private readonly META_FILE = path.join(this.CACHE_DIR, 'meta.json');

  // In-memory index for fast lookups
  private records: LeieRecord[] = [];
  private npiIndex: Map<string, LeieRecord[]> = new Map();
  private nameIndex: Map<string, LeieRecord[]> = new Map();
  private lastUpdated: Date | null = null;

  async onModuleInit() {
    // Try to load from cache on startup
    this.loadFromCache();

    // If cache is old (> 30 days), refresh
    if (this.shouldRefresh()) {
      await this.refreshDatabase();
    }
  }

  /**
   * Search for an individual in the LEIE
   */
  searchByName(firstName: string, lastName: string): LeieSearchResult {
    const key = this.normalizeKey(lastName, firstName);
    const matches = this.nameIndex.get(key) || [];

    return {
      isExcluded: matches.length > 0,
      matches,
      checkedAt: new Date(),
      databaseDate: this.lastUpdated?.toISOString() || null,
    };
  }

  /**
   * Search by NPI number
   */
  searchByNpi(npi: string): LeieSearchResult {
    const matches = this.npiIndex.get(npi) || [];

    return {
      isExcluded: matches.length > 0,
      matches,
      checkedAt: new Date(),
      databaseDate: this.lastUpdated?.toISOString() || null,
    };
  }

  /**
   * Combined search - checks both NPI and name
   */
  search(
    npi?: string,
    firstName?: string,
    lastName?: string,
  ): LeieSearchResult {
    const allMatches: LeieRecord[] = [];

    if (npi) {
      const npiResult = this.searchByNpi(npi);
      allMatches.push(...npiResult.matches);
    }

    if (firstName && lastName) {
      const nameResult = this.searchByName(firstName, lastName);
      // Avoid duplicates
      for (const match of nameResult.matches) {
        if (!allMatches.some((m) => m.npi === match.npi)) {
          allMatches.push(match);
        }
      }
    }

    return {
      isExcluded: allMatches.length > 0,
      matches: allMatches,
      checkedAt: new Date(),
      databaseDate: this.lastUpdated?.toISOString() || null,
    };
  }

  /**
   * Refresh the LEIE database (download fresh CSV)
   */
  async refreshDatabase(): Promise<void> {
    this.logger.log('[OIG LEIE] Downloading fresh exclusion database...');

    try {
      // Ensure cache directory exists
      if (!fs.existsSync(this.CACHE_DIR)) {
        fs.mkdirSync(this.CACHE_DIR, { recursive: true });
      }

      // Download CSV
      const response = await axios.get(this.LEIE_DOWNLOAD_URL, {
        responseType: 'text',
        timeout: 60000, // 60 seconds
      });

      // Save to cache
      fs.writeFileSync(this.CACHE_FILE, response.data as string);
      fs.writeFileSync(
        this.META_FILE,
        JSON.stringify({ lastUpdated: new Date().toISOString() }),
      );

      // Parse and index
      this.parseAndIndex(response.data as string);

      this.logger.log(
        `[OIG LEIE] Database refreshed: ${this.records.length} records indexed`,
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        `[OIG LEIE] Failed to refresh database: ${errorMessage}`,
      );
      // Don't throw - continue with cached data if available
    }
  }

  /**
   * Monthly cron to refresh LEIE database
   * OIG updates the database monthly
   */
  @Cron(CronExpression.EVERY_1ST_DAY_OF_MONTH_AT_MIDNIGHT)
  async handleMonthlyRefresh(): Promise<void> {
    this.logger.log('[OIG LEIE] Starting monthly database refresh...');
    await this.refreshDatabase();
  }

  /**
   * Load database from local cache
   */
  private loadFromCache(): void {
    try {
      if (!fs.existsSync(this.CACHE_FILE)) {
        this.logger.warn('[OIG LEIE] No cache found, will download fresh data');
        return;
      }

      const csvData = fs.readFileSync(this.CACHE_FILE, 'utf-8');
      this.parseAndIndex(csvData);

      // Load metadata
      if (fs.existsSync(this.META_FILE)) {
        const meta = JSON.parse(fs.readFileSync(this.META_FILE, 'utf-8')) as {
          lastUpdated: string;
        };
        this.lastUpdated = new Date(meta.lastUpdated);
      }

      this.logger.log(
        `[OIG LEIE] Loaded ${this.records.length} records from cache (last updated: ${this.lastUpdated?.toISOString() || 'unknown'})`,
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        `[OIG LEIE] Failed to load from cache: ${errorMessage}`,
      );
    }
  }

  /**
   * Parse CSV and build indexes
   */
  private parseAndIndex(csvData: string): void {
    try {
      const records = parse(csvData, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
      });

      this.records = [];
      this.npiIndex.clear();
      this.nameIndex.clear();

      for (const row of records as Record<string, string>[]) {
        const record: LeieRecord = {
          lastName: String(row['LASTNAME'] ?? ''),
          firstName: String(row['FIRSTNAME'] ?? ''),
          middleName: row['MIDNAME'] ? String(row['MIDNAME']) : undefined,
          busName: row['BUSNAME'] ? String(row['BUSNAME']) : undefined,
          general: row['GENERAL'] ? String(row['GENERAL']) : undefined,
          specialty: row['SPECIALTY'] ? String(row['SPECIALTY']) : undefined,
          upin: row['UPIN'] ? String(row['UPIN']) : undefined,
          npi: row['NPI'] ? String(row['NPI']) : undefined,
          dob: row['DOB'] ? String(row['DOB']) : undefined,
          address: row['ADDRESS'] ? String(row['ADDRESS']) : undefined,
          city: row['CITY'] ? String(row['CITY']) : undefined,
          state: row['STATE'] ? String(row['STATE']) : undefined,
          zip: row['ZIP'] ? String(row['ZIP']) : undefined,
          exclType: row['EXCLTYPE'] ? String(row['EXCLTYPE']) : undefined,
          exclDate: row['EXCLDATE'] ? String(row['EXCLDATE']) : undefined,
          reinDate: row['REINDATE'] ? String(row['REINDATE']) : undefined,
          waiverDate: row['WAIVERDATE'] ? String(row['WAIVERDATE']) : undefined,
          waiverState: row['WAIVERSTATE']
            ? String(row['WAIVERSTATE'])
            : undefined,
        };

        this.records.push(record);

        // Index by NPI
        if (record.npi) {
          const existing = this.npiIndex.get(record.npi) || [];
          existing.push(record);
          this.npiIndex.set(record.npi, existing);
        }

        // Index by name (LastName + FirstName, normalized)
        const nameKey = this.normalizeKey(record.lastName, record.firstName);
        if (nameKey) {
          const existing = this.nameIndex.get(nameKey) || [];
          existing.push(record);
          this.nameIndex.set(nameKey, existing);
        }
      }

      this.lastUpdated = new Date();
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(`[OIG LEIE] Failed to parse CSV: ${errorMessage}`);
    }
  }

  /**
   * Normalize name key for index lookups
   */
  private normalizeKey(lastName: string, firstName: string): string {
    return `${lastName.toLowerCase().trim()}:${firstName.toLowerCase().trim()}`;
  }

  /**
   * Check if database should be refreshed
   */
  private shouldRefresh(): boolean {
    if (!this.lastUpdated) return true;

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    return this.lastUpdated < thirtyDaysAgo;
  }

  /**
   * Get database stats
   */
  getStats(): {
    recordCount: number;
    lastUpdated: string | null;
    npiIndexSize: number;
    nameIndexSize: number;
  } {
    return {
      recordCount: this.records.length,
      lastUpdated: this.lastUpdated?.toISOString() || null,
      npiIndexSize: this.npiIndex.size,
      nameIndexSize: this.nameIndex.size,
    };
  }
}
