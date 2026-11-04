import { TestBed } from '@angular/core/testing';
import { SteamAuth } from './steam-auth';

describe('SteamAuth', () => {
  let service: SteamAuth;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(SteamAuth);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
