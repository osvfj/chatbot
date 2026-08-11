import { AtomRpc } from "effect/unstable/reactivity";
import { AllRpcs } from "../../shared/rpc";
import { layerRpcClient } from "../ipc";

export class Api extends AtomRpc.Service<Api>()("cafebot/Api", {
  group: AllRpcs,
  protocol: layerRpcClient,
}) {}
