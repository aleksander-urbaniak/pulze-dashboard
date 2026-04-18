import { faChartColumn } from "@fortawesome/free-solid-svg-icons";
import type { Settings, User } from "../../../lib/types";
import UserGreetingPill from "../../../components/UserGreetingPill";
import PageSectionHeader from "../../../components/PageSectionHeader";

type AnalyticsHeaderProps = {
  user: User;
  settings?: Settings | null;
};

export default function AnalyticsHeader({ user, settings }: AnalyticsHeaderProps) {
  return (
    <PageSectionHeader
      icon={faChartColumn}
      title="Analytics"
      right={<UserGreetingPill user={user} settings={settings} />}
    />
  );
}
