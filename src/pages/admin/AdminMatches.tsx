import { useState, useEffect, useRef } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { AdminProvider, useAdmin } from "@/hooks/useAdmin";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Plus, Edit, Trash2, Trophy, Upload, Crown, CheckCircle2, Clock, IndianRupee } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";

interface BetTotals {
  team_a_total: number;
  team_b_total: number;
  team_a_count: number;
  team_b_count: number;
}

type MatchStatus = "upcoming" | "live" | "completed" | "cancelled";

interface Match {
  id: string;
  sport: string;
  league: string | null;
  team_a: string;
  team_b: string;
  team_a_logo: string | null;
  team_b_logo: string | null;
  odds_team_a: number;
  odds_team_b: number;
  odds_draw: number | null;
  start_time: string;
  closing_time: string | null;
  extra_time: string | null;
  max_bet: number | null;
  status: MatchStatus;
  score_team_a: number | null;
  score_team_b: number | null;
  winner: string | null;
  toss_winner: string | null;
  info_image: string | null;
  info_text_1: string | null;
  info_text_2: string | null;
}

interface FormData {
  sport: string;
  league: string;
  team_a: string;
  team_b: string;
  team_a_logo: string;
  team_b_logo: string;
  odds_team_a: number;
  odds_team_b: number;
  start_time: string;
  closing_time: string;
  extra_time: string;
  max_bet: number;
  status: MatchStatus;
  info_image: string;
  info_text_1: string;
  info_text_2: string;
}

const emptyFormData: FormData = {
  sport: "cricket",
  league: "",
  team_a: "",
  team_b: "",
  team_a_logo: "",
  team_b_logo: "",
  odds_team_a: 2.0,
  odds_team_b: 2.0,
  start_time: "",
  closing_time: "",
  extra_time: "",
  max_bet: 100000,
  status: "upcoming",
  info_image: "",
  info_text_1: "",
  info_text_2: "",
};

const AdminMatchesContent = () => {
  const { isLoading } = useAdmin();
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [settleDialogOpen, setSettleDialogOpen] = useState(false);
  const [editingMatch, setEditingMatch] = useState<Partial<Match> | null>(null);
  const [settlingMatch, setSettlingMatch] = useState<Match | null>(null);
  const [formData, setFormData] = useState<FormData>(emptyFormData);
  const [saving, setSaving] = useState(false);
  const [settling, setSettling] = useState(false);
  const [uploadingA, setUploadingA] = useState(false);
  const [uploadingB, setUploadingB] = useState(false);
  const [uploadingInfo, setUploadingInfo] = useState(false);
  const [betTotals, setBetTotals] = useState<BetTotals | null>(null);
  const [loadingBetTotals, setLoadingBetTotals] = useState(false);
  const [settleDeadline, setSettleDeadline] = useState("");
  
  const fileInputARef = useRef<HTMLInputElement>(null);
  const fileInputBRef = useRef<HTMLInputElement>(null);
  const fileInputInfoRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchMatches();
  }, []);

  const fetchMatches = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("matches")
      .select("*")
      .eq("sport", "cricket")
      .order("start_time", { ascending: false });

    if (error) {
      console.error("Error fetching matches:", error);
      toast.error("Failed to fetch matches");
    } else {
      setMatches(data || []);
    }
    setLoading(false);
  };

  const uploadImage = async (file: File, team: 'a' | 'b') => {
    const setter = team === 'a' ? setUploadingA : setUploadingB;
    setter(true);

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}_${team}.${fileExt}`;
      const filePath = `team-logos/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('deposit-screenshots')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('deposit-screenshots')
        .getPublicUrl(filePath);

      if (team === 'a') {
        setFormData(prev => ({ ...prev, team_a_logo: publicUrl }));
      } else {
        setFormData(prev => ({ ...prev, team_b_logo: publicUrl }));
      }

      toast.success(`Team ${team.toUpperCase()} logo uploaded`);
    } catch (error: any) {
      toast.error(`Failed to upload: ${error.message}`);
    } finally {
      setter(false);
    }
  };

  const uploadInfoImage = async (file: File) => {
    setUploadingInfo(true);

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}_info.${fileExt}`;
      const filePath = `match-info/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('deposit-screenshots')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('deposit-screenshots')
        .getPublicUrl(filePath);

      setFormData(prev => ({ ...prev, info_image: publicUrl }));
      toast.success("Info image uploaded");
    } catch (error: any) {
      toast.error(`Failed to upload: ${error.message}`);
    } finally {
      setUploadingInfo(false);
    }
  };

  const openCreateDialog = () => {
    setEditingMatch(null);
    const now = new Date();
    const tomorrow = new Date(now.getTime() + 86400000);
    setFormData({
      ...emptyFormData,
      start_time: tomorrow.toISOString().slice(0, 16),
      closing_time: tomorrow.toISOString().slice(0, 16),
      extra_time: new Date(tomorrow.getTime() + 300000).toISOString().slice(0, 16),
    });
    setDialogOpen(true);
  };

  const openEditDialog = (match: Match) => {
    setEditingMatch(match);
    setFormData({
      sport: match.sport,
      league: match.league || "",
      team_a: match.team_a,
      team_b: match.team_b,
      team_a_logo: match.team_a_logo || "",
      team_b_logo: match.team_b_logo || "",
      odds_team_a: match.odds_team_a,
      odds_team_b: match.odds_team_b,
      start_time: match.start_time ? new Date(match.start_time).toISOString().slice(0, 16) : "",
      closing_time: match.closing_time ? new Date(match.closing_time).toISOString().slice(0, 16) : "",
      extra_time: match.extra_time ? new Date(match.extra_time).toISOString().slice(0, 16) : "",
      max_bet: match.max_bet || 100000,
      status: match.status,
      info_image: match.info_image || "",
      info_text_1: match.info_text_1 || "",
      info_text_2: match.info_text_2 || "",
    });
    setDialogOpen(true);
  };

  const openSettleDialog = async (match: Match) => {
    setSettlingMatch(match);
    setSettleDialogOpen(true);
    setBetTotals(null);
    setSettleDeadline("");
    setLoadingBetTotals(true);

    // Fetch bet totals for this match
    const { data: bets, error } = await supabase
      .from("bets")
      .select("bet_type, amount")
      .eq("match_id", match.id)
      .eq("status", "pending");

    if (error) {
      console.error("Error fetching bets:", error);
      setLoadingBetTotals(false);
      return;
    }

    const totals: BetTotals = {
      team_a_total: 0,
      team_b_total: 0,
      team_a_count: 0,
      team_b_count: 0,
    };

    bets?.forEach((bet) => {
      if (bet.bet_type === "team_a") {
        totals.team_a_total += Number(bet.amount);
        totals.team_a_count += 1;
      } else if (bet.bet_type === "team_b") {
        totals.team_b_total += Number(bet.amount);
        totals.team_b_count += 1;
      }
    });

    setBetTotals(totals);
    setLoadingBetTotals(false);
  };

  const handleSave = async () => {
    if (!formData.team_a || !formData.team_b || !formData.start_time) {
      toast.error("Please fill in all required fields");
      return;
    }

    setSaving(true);

    const matchData = {
      sport: "cricket",
      league: formData.league || null,
      team_a: formData.team_a,
      team_b: formData.team_b,
      team_a_logo: formData.team_a_logo || null,
      team_b_logo: formData.team_b_logo || null,
      odds_team_a: Number(formData.odds_team_a),
      odds_team_b: Number(formData.odds_team_b),
      start_time: new Date(formData.start_time).toISOString(),
      closing_time: formData.closing_time ? new Date(formData.closing_time).toISOString() : null,
      extra_time: formData.extra_time ? new Date(formData.extra_time).toISOString() : null,
      max_bet: Number(formData.max_bet),
      status: formData.status,
      info_image: formData.info_image || null,
      info_text_1: formData.info_text_1 || null,
      info_text_2: formData.info_text_2 || null,
    };

    if (editingMatch?.id) {
      const { error } = await supabase
        .from("matches")
        .update(matchData)
        .eq("id", editingMatch.id);

      if (error) {
        toast.error("Failed to update match");
      } else {
        toast.success("Match updated");
        setDialogOpen(false);
        fetchMatches();
      }
    } else {
      const { error } = await supabase.from("matches").insert(matchData);

      if (error) {
        toast.error("Failed to create match");
      } else {
        toast.success("Match created");
        setDialogOpen(false);
        fetchMatches();
      }
    }

    setSaving(false);
  };

  const handleSettle = async (winner: 'team_a' | 'team_b') => {
    if (!settlingMatch) return;

    setSettling(true);
    try {
      // Pass toss time if set - bets placed after this time will be refunded
      const { data, error } = await supabase.rpc('settle_toss_bets', {
        p_match_id: settlingMatch.id,
        p_toss_winner: winner,
        p_toss_time: settleDeadline ? new Date(settleDeadline).toISOString() : null
      });

      if (error) throw error;

      const result = data as { winners_count: number; losers_count: number; refunded_count: number; total_payout: number; total_refunded: number };
      
      let message = `Toss settled! ${result.winners_count} winners, ${result.losers_count} losers.`;
      if (result.refunded_count > 0) {
        message += ` ${result.refunded_count} bets refunded (₹${result.total_refunded.toLocaleString()}).`;
      }
      message += ` Payout: ₹${result.total_payout.toLocaleString()}`;
      
      toast.success(message);
      setSettleDialogOpen(false);
      setSettlingMatch(null);
      setBetTotals(null);
      setSettleDeadline("");
      fetchMatches();
    } catch (error: any) {
      toast.error(error.message || "Failed to settle match");
    } finally {
      setSettling(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this match?")) return;

    const { error } = await supabase.from("matches").delete().eq("id", id);

    if (error) {
      toast.error("Failed to delete match");
    } else {
      toast.success("Match deleted");
      fetchMatches();
    }
  };

  const getStatusBadge = (status: string, tossWinner: string | null) => {
    if (status === "completed" && tossWinner) {
      return <Badge className="bg-success/20 text-success">Settled</Badge>;
    }
    switch (status) {
      case "live":
        return <Badge className="bg-success/20 text-success animate-pulse">Live</Badge>;
      case "upcoming":
        return <Badge className="bg-primary/20 text-primary">Upcoming</Badge>;
      case "completed":
        return <Badge variant="secondary">Completed</Badge>;
      case "cancelled":
        return <Badge className="bg-destructive/20 text-destructive">Cancelled</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  if (isLoading || loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <AdminLayout title="Cricket Toss Match Management">
      <Card variant="default">
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5" />
            Cricket Toss Matches ({matches.length})
          </CardTitle>
          <Button variant="neon" onClick={openCreateDialog}>
            <Plus className="h-4 w-4 mr-1" />
            Add Match
          </Button>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Match</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Times</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Max Bet</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Status</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Toss Winner</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {matches.map((match) => (
                  <tr key={match.id} className="border-b border-border/50 hover:bg-accent/30">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <div className="flex -space-x-2">
                          {match.team_a_logo ? (
                            <img src={match.team_a_logo} alt="" className="w-8 h-8 rounded-full border-2 border-background object-cover" />
                          ) : (
                            <div className="w-8 h-8 rounded-full border-2 border-background bg-muted flex items-center justify-center text-xs">🏏</div>
                          )}
                          {match.team_b_logo ? (
                            <img src={match.team_b_logo} alt="" className="w-8 h-8 rounded-full border-2 border-background object-cover" />
                          ) : (
                            <div className="w-8 h-8 rounded-full border-2 border-background bg-muted flex items-center justify-center text-xs">🏏</div>
                          )}
                        </div>
                        <div>
                          <p className="font-medium">{match.team_a} vs {match.team_b}</p>
                          {match.league && (
                            <p className="text-xs text-muted-foreground">{match.league}</p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-sm">
                      <div className="space-y-1">
                        <p className="text-muted-foreground">
                          Start: {format(new Date(match.start_time), "dd MMM hh:mm a")}
                        </p>
                        {match.closing_time && (
                          <p className="text-destructive text-xs">
                            Close: {format(new Date(match.closing_time), "hh:mm a")}
                          </p>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-sm font-medium">
                      ₹{(match.max_bet || 100000).toLocaleString()}
                    </td>
                    <td className="py-3 px-4">{getStatusBadge(match.status, match.toss_winner)}</td>
                    <td className="py-3 px-4">
                      {match.toss_winner ? (
                        <div className="flex items-center gap-1 text-success">
                          <Crown className="h-4 w-4" />
                          <span className="text-sm font-medium">
                            {match.toss_winner === 'team_a' ? match.team_a : match.team_b}
                          </span>
                        </div>
                      ) : match.status === 'live' ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openSettleDialog(match)}
                        >
                          Settle Toss
                        </Button>
                      ) : (
                        <span className="text-muted-foreground text-sm">-</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEditDialog(match)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive hover:text-destructive"
                          onClick={() => handleDelete(match.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {matches.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                No matches found. Create your first cricket toss match!
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Hidden file inputs */}
      <input
        ref={fileInputARef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => e.target.files?.[0] && uploadImage(e.target.files[0], 'a')}
      />
      <input
        ref={fileInputBRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => e.target.files?.[0] && uploadImage(e.target.files[0], 'b')}
      />
      <input
        ref={fileInputInfoRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => e.target.files?.[0] && uploadInfoImage(e.target.files[0])}
      />

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingMatch ? "Edit Match" : "Create Cricket Toss Match"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {/* League */}
            <div className="space-y-2">
              <Label>League / Tournament</Label>
              <Input
                placeholder="e.g., IPL, BBL, PSL"
                value={formData.league}
                onChange={(e) => setFormData({ ...formData, league: e.target.value })}
              />
            </div>

            {/* Teams with Logo Upload */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Team A *</Label>
                <Input
                  placeholder="Team name"
                  value={formData.team_a}
                  onChange={(e) => setFormData({ ...formData, team_a: e.target.value })}
                />
                <div className="flex items-center gap-2">
                  {formData.team_a_logo ? (
                    <img src={formData.team_a_logo} alt="Team A" className="w-12 h-12 rounded-lg object-cover" />
                  ) : (
                    <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center">🏏</div>
                  )}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => fileInputARef.current?.click()}
                    disabled={uploadingA}
                  >
                    {uploadingA ? (
                      <span className="animate-spin">⏳</span>
                    ) : (
                      <>
                        <Upload className="h-3 w-3 mr-1" />
                        Logo
                      </>
                    )}
                  </Button>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Team B *</Label>
                <Input
                  placeholder="Team name"
                  value={formData.team_b}
                  onChange={(e) => setFormData({ ...formData, team_b: e.target.value })}
                />
                <div className="flex items-center gap-2">
                  {formData.team_b_logo ? (
                    <img src={formData.team_b_logo} alt="Team B" className="w-12 h-12 rounded-lg object-cover" />
                  ) : (
                    <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center">🏏</div>
                  )}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => fileInputBRef.current?.click()}
                    disabled={uploadingB}
                  >
                    {uploadingB ? (
                      <span className="animate-spin">⏳</span>
                    ) : (
                      <>
                        <Upload className="h-3 w-3 mr-1" />
                        Logo
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>

            {/* Odds */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Odds Team A</Label>
                <Input
                  type="number"
                  step="0.1"
                  min="1"
                  value={formData.odds_team_a}
                  onChange={(e) => setFormData({ ...formData, odds_team_a: parseFloat(e.target.value) })}
                />
              </div>
              <div className="space-y-2">
                <Label>Odds Team B</Label>
                <Input
                  type="number"
                  step="0.1"
                  min="1"
                  value={formData.odds_team_b}
                  onChange={(e) => setFormData({ ...formData, odds_team_b: parseFloat(e.target.value) })}
                />
              </div>
            </div>

            {/* Max Bet */}
            <div className="space-y-2">
              <Label>Max Bet Amount (₹)</Label>
              <Input
                type="number"
                min="100"
                value={formData.max_bet}
                onChange={(e) => setFormData({ ...formData, max_bet: parseInt(e.target.value) })}
              />
            </div>

            {/* Times */}
            <div className="grid grid-cols-1 gap-4">
              <div className="space-y-2">
                <Label>Match Start Time *</Label>
                <Input
                  type="datetime-local"
                  value={formData.start_time}
                  onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Close Time 100P</Label>
                  <Input
                    type="datetime-local"
                    value={formData.closing_time}
                    onChange={(e) => setFormData({ ...formData, closing_time: e.target.value })}
                  />
                  <p className="text-xs text-muted-foreground">Betting closes at 100% payout</p>
                </div>
                <div className="space-y-2">
                  <Label>Extra Time 95P</Label>
                  <Input
                    type="datetime-local"
                    value={formData.extra_time}
                    onChange={(e) => setFormData({ ...formData, extra_time: e.target.value })}
                  />
                  <p className="text-xs text-muted-foreground">Extended betting at 95% payout</p>
                </div>
              </div>
            </div>

            {/* Match Info Section (for Info Button) */}
            <div className="space-y-3 p-4 bg-accent/20 rounded-lg">
              <Label className="text-sm font-semibold">Match Info (shown in Info Button)</Label>
              
              {/* Info Image */}
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Info Image</Label>
                <div className="flex items-center gap-3">
                  {formData.info_image ? (
                    <img src={formData.info_image} alt="Info" className="w-20 h-20 rounded-lg object-cover" />
                  ) : (
                    <div className="w-20 h-20 rounded-lg bg-muted flex items-center justify-center text-muted-foreground">
                      No image
                    </div>
                  )}
                  <div className="flex flex-col gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => fileInputInfoRef.current?.click()}
                      disabled={uploadingInfo}
                    >
                      {uploadingInfo ? (
                        <span className="animate-spin">⏳</span>
                      ) : (
                        <>
                          <Upload className="h-3 w-3 mr-1" />
                          Upload Image
                        </>
                      )}
                    </Button>
                    {formData.info_image && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="text-destructive"
                        onClick={() => setFormData(prev => ({ ...prev, info_image: "" }))}
                      >
                        Remove
                      </Button>
                    )}
                  </div>
                </div>
              </div>

              {/* Info Text 1 */}
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Info Text Line 1</Label>
                <Input
                  placeholder="e.g., Match starts at 3:30 PM IST"
                  value={formData.info_text_1}
                  onChange={(e) => setFormData({ ...formData, info_text_1: e.target.value })}
                />
              </div>

              {/* Info Text 2 */}
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Info Text Line 2</Label>
                <Input
                  placeholder="e.g., Special bonus: 10% extra on winning bets!"
                  value={formData.info_text_2}
                  onChange={(e) => setFormData({ ...formData, info_text_2: e.target.value })}
                />
              </div>
            </div>

            {/* Status */}
            <div className="space-y-2">
              <Label>Status</Label>
              <Select
                value={formData.status}
                onValueChange={(v) => setFormData({ ...formData, status: v as MatchStatus })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="upcoming">Upcoming</SelectItem>
                  <SelectItem value="live">Live (Open for betting)</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="neon" onClick={handleSave} disabled={saving}>
              {saving ? "Saving..." : editingMatch ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Settle Toss Dialog */}
      <Dialog open={settleDialogOpen} onOpenChange={setSettleDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Crown className="h-5 w-5 text-primary" />
              Settle Toss - Select Winner
            </DialogTitle>
            <DialogDescription>
              {settlingMatch?.team_a} vs {settlingMatch?.team_b}
            </DialogDescription>
          </DialogHeader>
          
          {settlingMatch && (
            <div className="space-y-4">
              {/* Bet Totals Summary */}
              <div className="bg-accent/30 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-3">
                  <IndianRupee className="h-4 w-4 text-primary" />
                  <span className="font-medium text-sm">Total Bets Placed</span>
                </div>
                {loadingBetTotals ? (
                  <div className="text-center text-sm text-muted-foreground">Loading bet data...</div>
                ) : betTotals ? (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-3 bg-background rounded-lg border border-border">
                      <p className="text-xs text-muted-foreground mb-1">{settlingMatch.team_a}</p>
                      <p className="text-lg font-bold text-primary">₹{betTotals.team_a_total.toLocaleString()}</p>
                      <p className="text-xs text-muted-foreground">{betTotals.team_a_count} bets</p>
                    </div>
                    <div className="text-center p-3 bg-background rounded-lg border border-border">
                      <p className="text-xs text-muted-foreground mb-1">{settlingMatch.team_b}</p>
                      <p className="text-lg font-bold text-primary">₹{betTotals.team_b_total.toLocaleString()}</p>
                      <p className="text-xs text-muted-foreground">{betTotals.team_b_count} bets</p>
                    </div>
                  </div>
                ) : (
                  <div className="text-center text-sm text-muted-foreground">No bets placed yet</div>
                )}
              </div>

              {/* Actual Toss Time Setting */}
              <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Clock className="h-4 w-4 text-destructive" />
                  <span className="font-medium text-sm text-destructive">Actual Toss Time (Optional)</span>
                </div>
                <p className="text-xs text-muted-foreground mb-2">
                  Enter the exact time when the toss happened. Bets placed AFTER this time will be <strong>refunded</strong> (invalid bets).
                </p>
                <Input
                  type="datetime-local"
                  value={settleDeadline}
                  onChange={(e) => setSettleDeadline(e.target.value)}
                  className="w-full"
                />
                {settleDeadline && (
                  <p className="text-xs text-warning mt-2 font-medium">
                    ⚠️ Bets after {format(new Date(settleDeadline), "dd MMM yyyy hh:mm:ss a")} will be refunded
                  </p>
                )}
              </div>

              <p className="text-sm text-muted-foreground text-center">
                Select which team won the toss. Winners will be automatically paid.
              </p>
              
              <div className="grid grid-cols-2 gap-4">
                <Button
                  variant="outline"
                  className="h-auto py-4 flex flex-col gap-2 hover:border-success hover:bg-success/10"
                  onClick={() => handleSettle('team_a')}
                  disabled={settling}
                >
                  {settlingMatch.team_a_logo ? (
                    <img src={settlingMatch.team_a_logo} alt="" className="w-12 h-12 rounded-lg object-cover" />
                  ) : (
                    <span className="text-2xl">🏏</span>
                  )}
                  <span className="font-medium">{settlingMatch.team_a}</span>
                  {betTotals && (
                    <span className="text-xs text-muted-foreground">₹{betTotals.team_a_total.toLocaleString()}</span>
                  )}
                  <CheckCircle2 className="h-4 w-4 text-success" />
                </Button>
                <Button
                  variant="outline"
                  className="h-auto py-4 flex flex-col gap-2 hover:border-success hover:bg-success/10"
                  onClick={() => handleSettle('team_b')}
                  disabled={settling}
                >
                  {settlingMatch.team_b_logo ? (
                    <img src={settlingMatch.team_b_logo} alt="" className="w-12 h-12 rounded-lg object-cover" />
                  ) : (
                    <span className="text-2xl">🏏</span>
                  )}
                  <span className="font-medium">{settlingMatch.team_b}</span>
                  {betTotals && (
                    <span className="text-xs text-muted-foreground">₹{betTotals.team_b_total.toLocaleString()}</span>
                  )}
                  <CheckCircle2 className="h-4 w-4 text-success" />
                </Button>
              </div>

              {settling && (
                <div className="text-center text-sm text-muted-foreground">
                  Settling bets and paying winners...
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

const AdminMatches = () => (
  <AdminProvider>
    <AdminMatchesContent />
  </AdminProvider>
);

export default AdminMatches;