"use client";

import { FormEvent, useEffect, useState } from "react";
import { Wallet } from "lucide-react";
import { useAuth } from "../../components/auth-provider";
import { RequireAuth } from "../../components/require-auth";
import { apiRequest } from "../../lib/api";

type Profile = {
  id: string;
  email: string;
  fullName: string;
  phone?: string;
  role: string;
  walletAddress?: string;
};

type EthereumProvider = {
  isMetaMask?: boolean;
  request(args: { method: string; params?: unknown[] }): Promise<unknown>;
};

type InjectedEthereum = EthereumProvider & { providers?: EthereumProvider[] };
type Eip6963Detail = {
  info: { name: string; rdns: string };
  provider: EthereumProvider;
};

async function findMetaMask(): Promise<EthereumProvider | undefined> {
  const discovered: Eip6963Detail[] = [];
  const announce = (event: Event) => {
    discovered.push((event as CustomEvent<Eip6963Detail>).detail);
  };

  window.addEventListener("eip6963:announceProvider", announce);
  window.dispatchEvent(new Event("eip6963:requestProvider"));
  await new Promise((resolve) => window.setTimeout(resolve, 250));
  window.removeEventListener("eip6963:announceProvider", announce);

  const announced = discovered.find(
    ({ info, provider }) =>
      info.rdns === "io.metamask" || info.name.toLowerCase() === "metamask" || provider.isMetaMask
  );
  if (announced) return announced.provider;

  const injected = (window as Window & { ethereum?: InjectedEthereum }).ethereum;
  return injected?.providers?.find((provider) => provider.isMetaMask) ??
    (injected?.isMetaMask ? injected : undefined);
}

export default function ProfilePage() {
  const { session } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [walletAddress, setWalletAddress] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!session) return;
    apiRequest<Profile>("/profile", {}, session.accessToken)
      .then((result) => {
        setProfile(result);
        setWalletAddress(result.walletAddress ?? "");
      })
      .catch((reason) => setError(reason.message));
  }, [session]);

  async function save(address: string) {
    if (!session) return;
    setLoading(true);
    setError("");
    setMessage("");
    try {
      const updated = await apiRequest<Profile>(
        "/profile/wallet",
        { method: "PATCH", body: JSON.stringify({ walletAddress: address }) },
        session.accessToken
      );
      setProfile(updated);
      setWalletAddress(updated.walletAddress ?? "");
      setMessage("Wallet address saved successfully.");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Wallet update failed");
    } finally {
      setLoading(false);
    }
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    await save(walletAddress);
  }

  async function connectMetaMask() {
    setError("");
    setMessage("");
    try {
      const metaMask = await findMetaMask();
      if (!metaMask) {
        throw new Error(
          "MetaMask was not detected. Enable MetaMask for this site, disable conflicting wallet extensions, or enter the address manually."
        );
      }
      const accounts = (await metaMask.request({ method: "eth_requestAccounts" })) as string[];
      if (!accounts[0]) throw new Error("MetaMask did not return an account");
      setWalletAddress(accounts[0]);
      await save(accounts[0]);
    } catch (reason) {
      const walletError = reason as { code?: number; message?: string };
      setError(
        walletError.code === 4001
          ? "MetaMask connection was rejected. Approve the request to connect your account."
          : walletError.message || "MetaMask could not connect. Try disabling other wallet extensions."
      );
    }
  }

  return (
    <RequireAuth>
      <div className="page-head">
        <div>
          <div className="eyebrow">Account settings</div>
          <h1>My wallet</h1>
          <p className="lede">Set the Ethereum address that will own your digital land title.</p>
        </div>
      </div>
      {error && <div className="error">{error}</div>}
      {message && <div className="success">{message}</div>}
      <form className="card" onSubmit={submit}>
        <div className="inline">
          <Wallet size={24} color="#185c3f" />
          <h2>{profile?.fullName ?? "Wallet details"}</h2>
        </div>
        <p className="muted">
          MetaMask support is optional and currently intended for the local Hardhat development network.
        </p>
        <div className="field">
          <label htmlFor="walletAddress">Ethereum wallet address</label>
          <input
            id="walletAddress"
            value={walletAddress}
            onChange={(event) => setWalletAddress(event.target.value)}
            placeholder="0x..."
            pattern="0x[0-9a-fA-F]{40}"
            required
          />
        </div>
        <div className="inline">
          <button className="button" disabled={loading}>
            {loading ? "Saving…" : "Save address"}
          </button>
          <button className="button secondary" type="button" disabled={loading} onClick={connectMetaMask}>
            Connect MetaMask
          </button>
        </div>
      </form>
    </RequireAuth>
  );
}
