export interface AttachedFile {
  buffer: Buffer;
  mimetype: string;
}

export class VerificationRequest {
  constructor(
    public readonly providerId: string,
    public readonly countryCode: string,
    public readonly attributes: {
      firstName: string;
      lastName: string;
      licenseNumber: string;
      dateOfBirth?: Date;
    },
    public readonly documents: AttachedFile[] = [],
    public readonly idDocument?: AttachedFile,
  ) {}
}
