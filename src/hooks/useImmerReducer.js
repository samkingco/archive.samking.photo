import { useReducer } from 'react';
import produce from 'immer';

export default function useImmerReducer(reducer, initialState, initialAction) {
  return useReducer(produce(reducer), initialState, initialAction);
}
