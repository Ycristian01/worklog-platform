"use client";

import { signIn, signOut } from "next-auth/react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { LogOut, Github, Calendar } from "lucide-react";
import { format } from "date-fns";
import { useGitHubOrgs, useUpdateGitHubSettings } from "@/lib/hooks";
import { toast } from "sonner";

interface ProfileProps {
  user: {
    id: string;
    name: string;
    email: string;
    image: string | null;
    role: string;
    createdAt: string;
  };
  integrations: {
    provider: string;
    connectedAt: string;
    lastSyncAt: string | null;
  }[];
}

const PROVIDER_META: Record<string, { label: string; icon: React.ReactNode }> = {
  google: { label: "Google Calendar", icon: <Calendar className="h-4 w-4" /> },
  github: { label: "GitHub", icon: <Github className="h-4 w-4" /> },
};

export function ProfileClient({ user, integrations }: ProfileProps) {
  const initials = user.name
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const connectedProviders = new Set(integrations.map((i) => i.provider));
  const githubConnected = connectedProviders.has("github");

  return (
    <div className="mx-auto max-w-2xl p-6 space-y-6">
      <h1 className="text-2xl font-bold">Profile</h1>

      <Card>
        <CardHeader>
          <CardTitle>Account</CardTitle>
          <CardDescription>Your account information</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16">
              <AvatarImage src={user.image ?? undefined} />
              <AvatarFallback className="text-lg">{initials}</AvatarFallback>
            </Avatar>
            <div>
              <p className="text-lg font-medium">{user.name}</p>
              <p className="text-sm text-muted-foreground">{user.email}</p>
              <div className="mt-1 flex items-center gap-2">
                <Badge variant="secondary" className="capitalize">
                  {user.role}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  Joined {format(new Date(user.createdAt), "MMM d, yyyy")}
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Connected Integrations</CardTitle>
          <CardDescription>
            Services linked to your account for automatic worklog generation
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {(["google", "github"] as const).map((provider) => {
            const meta = PROVIDER_META[provider];
            const integration = integrations.find((i) => i.provider === provider);
            const connected = connectedProviders.has(provider);

            return (
              <div key={provider}>
                <div className="flex items-center justify-between py-2">
                  <div className="flex items-center gap-3">
                    {meta.icon}
                    <div>
                      <p className="text-sm font-medium">{meta.label}</p>
                      {connected && integration && (
                        <p className="text-xs text-muted-foreground">
                          Connected {format(new Date(integration.connectedAt), "MMM d, yyyy")}
                          {integration.lastSyncAt &&
                            ` · Last synced ${format(new Date(integration.lastSyncAt), "MMM d, yyyy h:mm a")}`}
                        </p>
                      )}
                    </div>
                  </div>
                  {connected ? (
                    <Badge variant="outline" className="text-green-600 border-green-600">
                      Connected
                    </Badge>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => signIn(provider, { callbackUrl: "/profile" })}
                    >
                      Connect
                    </Button>
                  )}
                </div>
                <Separator />
              </div>
            );
          })}
        </CardContent>
      </Card>

      {githubConnected && <GitHubOrgSelector />}

      <Card>
        <CardContent className="pt-6">
          <Button
            variant="destructive"
            onClick={() => signOut({ callbackUrl: "/login" })}
          >
            <LogOut className="mr-2 h-4 w-4" />
            Sign out
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

function GitHubOrgSelector() {
  const { data, isLoading } = useGitHubOrgs();
  const updateSettings = useUpdateGitHubSettings();

  const handleOrgChange = (value: string | null) => {
    if (!value) return;
    const orgValue = value === "__all__" ? null : value;
    updateSettings.mutate(
      { githubOrg: orgValue },
      {
        onSuccess: () => {
          toast.success(
            orgValue
              ? `GitHub sync filtered to ${orgValue}`
              : "GitHub sync set to all organizations"
          );
        },
        onError: (err) => toast.error(err.message),
      }
    );
  };

  if (isLoading || !data) return null;
  if (data.orgs.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>GitHub Settings</CardTitle>
        <CardDescription>
          Choose which organization to sync activity from
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-3">
          <label className="text-sm font-medium whitespace-nowrap">
            Organization
          </label>
          <Select
            value={data.selectedOrg ?? "__all__"}
            onValueChange={handleOrgChange}
            disabled={updateSettings.isPending}
          >
            <SelectTrigger className="w-64">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">All organizations</SelectItem>
              {data.orgs.map((org) => (
                <SelectItem key={org.login} value={org.login}>
                  {org.login}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardContent>
    </Card>
  );
}
