import { Test, TestingModule } from '@nestjs/testing';
import { LeieService } from './leie.service';
import * as fs from 'fs';
import axios from 'axios';

jest.mock('fs');
jest.mock('axios');

const mockedFs = fs as jest.Mocked<typeof fs>;
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('LeieService', () => {
  let service: LeieService;

  const mockCsvData = `LASTNAME,FIRSTNAME,MIDNAME,BUSNAME,GENERAL,SPECIALTY,UPIN,NPI,DOB,ADDRESS,CITY,STATE,ZIP,EXCLTYPE,EXCLDATE,REINDATE,WAIVERDATE,WAIVERSTATE
SMITH,JOHN,M,,MEDICAL PRACTICE,FAMILY MEDICINE,,1234567890,1970-01-01,123 MAIN ST,HOUSTON,TX,77001,1128A,2020-01-15,,,
DOE,JANE,A,,NURSING,REGISTERED NURSE,,0987654321,1980-05-15,456 OAK AVE,MIAMI,FL,33101,1128B,2021-06-01,,,`;

  beforeEach(async () => {
    jest.clearAllMocks();

    // Mock file system - no cache file exists by default
    mockedFs.existsSync.mockReturnValue(false);

    const module: TestingModule = await Test.createTestingModule({
      providers: [LeieService],
    }).compile();

    service = module.get<LeieService>(LeieService);
  });

  describe('getStats', () => {
    it('should return empty stats when database not loaded', () => {
      const stats = service.getStats();

      expect(stats.recordCount).toBe(0);
      expect(stats.lastUpdated).toBeNull();
      expect(stats.npiIndexSize).toBe(0);
      expect(stats.nameIndexSize).toBe(0);
    });
  });

  describe('searchByName', () => {
    it('should return not excluded when database is empty', () => {
      const result = service.searchByName('John', 'Smith');

      expect(result.isExcluded).toBe(false);
      expect(result.matches).toHaveLength(0);
    });

    it('should find excluded individual after parsing data', () => {
      // Manually parse CSV to populate database
      (
        service as unknown as { parseAndIndex: (data: string) => void }
      ).parseAndIndex(mockCsvData);

      const result = service.searchByName('John', 'Smith');

      expect(result.isExcluded).toBe(true);
      expect(result.matches.length).toBeGreaterThan(0);
      expect(result.matches[0].lastName).toBe('SMITH');
    });
  });

  describe('searchByNpi', () => {
    it('should return not excluded when database is empty', () => {
      const result = service.searchByNpi('1234567890');

      expect(result.isExcluded).toBe(false);
      expect(result.matches).toHaveLength(0);
    });

    it('should find excluded individual by NPI after parsing data', () => {
      (
        service as unknown as { parseAndIndex: (data: string) => void }
      ).parseAndIndex(mockCsvData);

      const result = service.searchByNpi('1234567890');

      expect(result.isExcluded).toBe(true);
      expect(result.matches.length).toBeGreaterThan(0);
    });
  });

  describe('search', () => {
    it('should return not excluded with no search parameters', () => {
      const result = service.search();

      expect(result.isExcluded).toBe(false);
    });

    it('should search by both NPI and name', () => {
      (
        service as unknown as { parseAndIndex: (data: string) => void }
      ).parseAndIndex(mockCsvData);

      const result = service.search('1234567890', 'John', 'Smith');

      expect(result.isExcluded).toBe(true);
      expect(result.checkedAt).toBeInstanceOf(Date);
    });

    it('should search by name only when NPI not provided', () => {
      (
        service as unknown as { parseAndIndex: (data: string) => void }
      ).parseAndIndex(mockCsvData);

      const result = service.search(undefined, 'Jane', 'Doe');

      expect(result.isExcluded).toBe(true);
    });
  });

  describe('shouldRefresh', () => {
    it('should return true when database is empty', () => {
      expect(service.shouldRefresh()).toBe(true);
    });

    it('should return false after data is loaded', () => {
      (
        service as unknown as { parseAndIndex: (data: string) => void }
      ).parseAndIndex(mockCsvData);
      // Manually set lastUpdated
      (service as unknown as { lastUpdated: Date | null }).lastUpdated =
        new Date();

      expect(service.shouldRefresh()).toBe(false);
    });
  });

  describe('refreshDatabase', () => {
    it('should download and parse CSV data', async () => {
      mockedAxios.get.mockResolvedValue({ data: mockCsvData });
      mockedFs.mkdirSync.mockImplementation(() => undefined);
      mockedFs.writeFileSync.mockImplementation(() => undefined);

      await service.refreshDatabase();

      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(mockedAxios.get).toHaveBeenCalled();
      const stats = service.getStats();
      expect(stats.recordCount).toBeGreaterThan(0);
    });

    it('should handle download errors gracefully', async () => {
      mockedAxios.get.mockRejectedValue(new Error('Network error'));

      // Should not throw
      await expect(service.refreshDatabase()).resolves.not.toThrow();
    });
  });

  describe('loadFromCache', () => {
    it('should load data from cached file', () => {
      mockedFs.existsSync.mockReturnValue(true);
      mockedFs.readFileSync.mockReturnValue(mockCsvData);
      mockedFs.statSync.mockReturnValue({ mtime: new Date() } as fs.Stats);

      // Re-create service to trigger cache loading
      (service as unknown as { loadFromCache: () => void }).loadFromCache();

      const stats = service.getStats();
      expect(stats.recordCount).toBeGreaterThan(0);
    });
  });
});
