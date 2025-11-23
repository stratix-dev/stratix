declare module '@tensorflow-models/universal-sentence-encoder' {
  import * as tf from '@tensorflow/tfjs';

  export interface UniversalSentenceEncoder {
    embed(inputs: string[] | string): Promise<tf.Tensor2D>;
  }

  export function load(): Promise<UniversalSentenceEncoder>;
}
