export interface MethodInput {
  name: string;
  type: string;
  internalType?: string;
  indexed?: boolean;
}

export interface AbiItem {
  type: string;
  name?: string;
  inputs?: MethodInput[];
  outputs?: MethodInput[];
  stateMutability?: string;
  constant?: boolean;
  payable?: boolean;
  anonymous?: boolean;
} 