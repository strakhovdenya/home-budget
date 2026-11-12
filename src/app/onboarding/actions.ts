'use server';
import {createOnboarding} from '@/features/onboarding/use-cases';
import {requireOwner} from '@/infrastructure/auth/auth';
import {createOnboardingRepository} from '@/infrastructure/db/onboarding-repository';
import {databaseFromEnvironment} from '@/infrastructure/db/client';
import type {OnboardingRepository} from '@/domain/onboarding/ports';
const repository:OnboardingRepository={
  preview:(...args)=>createOnboardingRepository(databaseFromEnvironment()).preview(...args),
  confirm:(...args)=>createOnboardingRepository(databaseFromEnvironment()).confirm(...args),
  status:(...args)=>createOnboardingRepository(databaseFromEnvironment()).status(...args),
};
const onboarding=createOnboarding(requireOwner,repository);
export async function previewFirstBudget(input:unknown){return onboarding.preview(input);}
export async function confirmFirstBudget(input:unknown){return onboarding.confirm(input);}
export async function firstBudgetStatus(input:unknown){return onboarding.status(input);}
