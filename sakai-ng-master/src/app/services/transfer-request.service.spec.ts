import { TestBed } from '@angular/core/testing';

import { TransferRequestService } from './transfer-request.service';

describe('TransferRequestService', () => {
  let service: TransferRequestService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(TransferRequestService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
