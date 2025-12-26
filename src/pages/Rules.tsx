import { Header } from "@/components/layout/Header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollText, AlertTriangle, Clock, Wallet, CloudRain, RefreshCw, Users, Ban } from "lucide-react";

const rules = [
  {
    number: 1,
    icon: Clock,
    title: "What if toss is done before time?",
    content: (
      <>
        <p className="mb-3">
          If any toss is done before time, then from the same minute, all bets will be invalid.
        </p>
        <p className="mb-3 text-muted-foreground text-sm">
          (If you place bets on the losing team after the toss is done, then create a ticket in help and support for a refund.)
        </p>
        <div className="p-3 rounded-lg bg-primary/10 border border-primary/20 space-y-2">
          <p className="font-semibold text-sm">Example:</p>
          <p className="text-sm">Toss closing time: <span className="font-bold">10:30 PM</span></p>
          <p className="text-sm">Toss done at: <span className="font-bold text-destructive">10:27 PM</span></p>
          <p className="text-sm mt-2">
            In this case, all bets before 10:27 (until 10:26) will be <span className="text-success font-semibold">valid</span>.
            Bets after 10:27 and from the 27th minute will be <span className="text-destructive font-semibold">invalid</span>, no matter if you win or lose.
          </p>
        </div>
      </>
    ),
  },
  {
    number: 2,
    icon: Wallet,
    title: "Extra wallet balance issue",
    content: (
      <p>
        If by any internet issue or server issue, extra money is added to your wallet amount, <span className="font-bold text-destructive">DO NOT use that amount</span> until our admin checks it. You must inform help and support (create a ticket) immediately, else the amount will be reset to 00.
      </p>
    ),
  },
  {
    number: 3,
    icon: AlertTriangle,
    title: "Uncontested toss",
    content: (
      <>
        <p className="mb-3">
          In case of uncontested toss, we invalidate all bets of that match.
        </p>
        <p className="text-muted-foreground text-sm italic mb-3">
          (Jab toss uncontested hota he to hm bets invalid karte he)
        </p>
        <div className="p-3 rounded-lg bg-muted/50 text-sm">
          <p className="font-medium mb-1">What is an uncontested toss?</p>
          <p className="text-muted-foreground">
            In cricket, an uncontested toss happens when the visiting captain chooses to bowl first without a coin toss. This is recorded on the scorecard as "toss uncontested".
          </p>
        </div>
      </>
    ),
  },
  {
    number: 4,
    icon: CloudRain,
    title: "Rain delay cancellation",
    content: (
      <p>
        If the toss has been delayed due to rain and our admin cancels all bets of that match, then all bets for this toss are <span className="font-bold text-destructive">invalid</span>. No arguments will be accepted if the toss happened. <span className="font-semibold">Once toss is cancelled, it's cancelled.</span>
      </p>
    ),
  },
  {
    number: 5,
    icon: Wallet,
    title: "Negative balance settlement",
    content: (
      <p>
        If toss is done before time or results of toss changes, and your wallet balance goes negative, then the admin has the power to cancel your upcoming pending bets to settle your balance.
      </p>
    ),
  },
  {
    number: 6,
    icon: RefreshCw,
    title: "Result changes",
    content: (
      <>
        <p className="mb-3">
          If the result of any toss gets changed in 2 to 4 hours and if change is possible, we will definitely change the result. But if by any reason it is not possible, we won't change the result. <span className="font-semibold">No arguments will be done in that case.</span>
        </p>
        <p className="mb-3 text-muted-foreground text-sm">
          If there are different results showing for the same match on different sites, we will consider what our team says. <span className="font-semibold">Admin decision will be final.</span>
        </p>
        <div className="p-3 rounded-lg bg-muted/50 text-sm">
          <p className="font-medium mb-1">Team name change example:</p>
          <p className="text-muted-foreground">
            If any team gets changed, we will update the result considering the opposing team. For example: Border vs Eastern match - if Border gets changed to Western, then if Western wins toss we give win to Border, else if Eastern wins we give win to Eastern.
          </p>
        </div>
      </>
    ),
  },
  {
    number: 7,
    icon: Users,
    title: "Multiple accounts & fake deposits",
    content: (
      <div className="space-y-4">
        <div className="flex items-start gap-3 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
          <Ban className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-destructive">Multiple Accounts</p>
            <p className="text-sm">
              If any user uses multiple accounts (2 or more IDs on our site), the user will be <span className="font-bold">permanently banned</span> from our site. One user can use only one account at a time.
            </p>
          </div>
        </div>
        <div className="flex items-start gap-3 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
          <Ban className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-destructive">Fake Deposit Screenshots</p>
            <p className="text-sm">
              If any user uses fake deposit screenshots, the user will be <span className="font-bold">permanently banned</span> and won't be able to play afterwards.
            </p>
          </div>
        </div>
      </div>
    ),
  },
];

const Rules = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="pt-20 pb-12 px-4">
        <div className="container mx-auto max-w-4xl">
          {/* Header */}
          <div className="mb-8 text-center animate-fade-in">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 mb-4">
              <ScrollText className="h-5 w-5 text-primary" />
              <span className="text-sm font-medium text-primary">BETTING GUIDELINES</span>
            </div>
            <h1 className="font-display text-2xl md:text-4xl font-bold tracking-wide mb-2">
              Our <span className="text-glow">Rules</span>
            </h1>
            <p className="text-muted-foreground max-w-lg mx-auto">
              Defines the minimum and maximum bet limits for all games and events. Please read carefully before placing bets.
            </p>
          </div>

          {/* Rules List */}
          <div className="space-y-4">
            {rules.map((rule, index) => (
              <Card 
                key={rule.number} 
                className="overflow-hidden animate-fade-in"
                style={{ animationDelay: `${0.1 * index}s` }}
              >
                <CardContent className="p-0">
                  <div className="flex items-stretch">
                    {/* Rule Number Badge */}
                    <div className="flex-shrink-0 w-16 md:w-20 bg-primary/10 flex flex-col items-center justify-center border-r border-border">
                      <rule.icon className="h-5 w-5 text-primary mb-1" />
                      <Badge variant="outline" className="text-xs font-bold">
                        Rule {rule.number}
                      </Badge>
                    </div>
                    
                    {/* Rule Content */}
                    <div className="flex-1 p-4 md:p-5">
                      <h3 className="font-display font-bold text-lg mb-3 text-foreground">
                        {rule.title}
                      </h3>
                      <div className="text-sm text-foreground/90 leading-relaxed">
                        {rule.content}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Footer Note */}
          <Card className="mt-8 bg-primary/5 border-primary/20 animate-fade-in">
            <CardContent className="p-6 text-center">
              <AlertTriangle className="h-8 w-8 text-primary mx-auto mb-3" />
              <p className="font-semibold mb-2">Admin Decision is Final</p>
              <p className="text-sm text-muted-foreground">
                In case of any disputes or unclear situations, the admin's decision will be considered final and binding.
              </p>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default Rules;