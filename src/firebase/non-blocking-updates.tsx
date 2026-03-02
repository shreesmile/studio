'use client';
    
import {
  setDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  CollectionReference,
  DocumentReference,
  SetOptions,
} from 'firebase/firestore';
import { errorEmitter } from '@/firebase/error-emitter';
import {FirestorePermissionError} from '@/firebase/errors';

/**
 * Initiates a setDoc operation for a document reference.
 * Does NOT await the write operation internally.
 */
export function setDocumentNonBlocking(docRef: DocumentReference, data: any, options: SetOptions) {
  console.log(`[FirestoreMutation] setDoc initiated at ${docRef.path}`, data);
  setDoc(docRef, data, options).catch(error => {
    console.error(`[FirestoreMutation] setDoc failed at ${docRef.path}`, error);
    errorEmitter.emit(
      'permission-error',
      new FirestorePermissionError({
        path: docRef.path,
        operation: 'write',
        requestResourceData: data,
      })
    )
  })
}


/**
 * Initiates an addDoc operation for a collection reference.
 * Does NOT await the write operation internally.
 * Returns the Promise for the new doc ref, but typically not awaited by caller.
 */
export function addDocumentNonBlocking(colRef: CollectionReference, data: any) {
  console.log(`[FirestoreMutation] addDoc initiated at ${colRef.path}`, data);
  const promise = addDoc(colRef, data)
    .catch(error => {
      console.error(`[FirestoreMutation] addDoc failed at ${colRef.path}`, error);
      errorEmitter.emit(
        'permission-error',
        new FirestorePermissionError({
          path: colRef.path,
          operation: 'create',
          requestResourceData: data,
        })
      )
    });
  return promise;
}


/**
 * Initiates an updateDoc operation for a document reference.
 * Does NOT await the write operation internally.
 */
export function updateDocumentNonBlocking(docRef: DocumentReference, data: any) {
  console.log(`[FirestoreMutation] updateDoc initiated at ${docRef.path}`, data);
  updateDoc(docRef, data)
    .catch(error => {
      console.error(`[FirestoreMutation] updateDoc failed at ${docRef.path}`, error);
      errorEmitter.emit(
        'permission-error',
        new FirestorePermissionError({
          path: docRef.path,
          operation: 'update',
          requestResourceData: data,
        })
      )
    });
}


/**
 * Initiates a deleteDoc operation for a document reference.
 * Does NOT await the write operation internally.
 */
export function deleteDocumentNonBlocking(docRef: DocumentReference) {
  console.log(`[FirestoreMutation] deleteDoc initiated at ${docRef.path}`);
  deleteDoc(docRef)
    .catch(error => {
      console.error(`[FirestoreMutation] deleteDoc failed at ${docRef.path}`, error);
      errorEmitter.emit(
        'permission-error',
        new FirestorePermissionError({
          path: docRef.path,
          operation: 'delete',
        })
      )
    });
}
