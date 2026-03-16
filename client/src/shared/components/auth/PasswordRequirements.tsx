import { Check, Circle } from 'lucide-react';

interface Requirement {
  label: string;
  met: boolean;
}

interface PasswordRequirementsProps {
  passwordValue: string;
  isSubmitted?: boolean;
}

export const PasswordRequirements = ({ passwordValue, isSubmitted = false }: PasswordRequirementsProps) => {
  const requirements: Requirement[] = [
    { 
      label: 'Minimum 8 characters', 
      met: passwordValue.length >= 8 
    },
    { 
      label: 'Must include at least one number', 
      met: /[0-9]/.test(passwordValue) 
    },
    { 
      label: 'Must include at least one special character', 
      met: /[^a-zA-Z0-9]/.test(passwordValue) 
    },
  ];

  return (
    <div className="mt-2 text-[10px] space-y-1.5 text-muted-foreground bg-muted/30 p-2.5 rounded-md border border-border/50 transition-all duration-300">
      <p className="font-semibold text-[11px] mb-1.5 text-foreground/80">Password Requirements:</p>
      <ul className="space-y-1.5">
        {requirements.map((req, index) => {
          const showRed = !req.met && isSubmitted;
          
          return (
            <li 
              key={index} 
              className={`flex items-center gap-2 transition-colors duration-200 ${
                req.met 
                  ? "text-green-600 dark:text-green-400 font-medium" 
                  : showRed 
                    ? "text-destructive font-semibold" 
                    : "text-muted-foreground/70"
              }`}
            >
              {req.met ? (
                <div className="bg-green-100 dark:bg-green-900/30 rounded-full p-0.5">
                  <Check className="w-3 h-3 stroke-[3]" />
                </div>
              ) : showRed ? (
                <div className="bg-destructive/10 rounded-full p-0.5">
                  <Circle className="w-3 h-3 fill-destructive/20 stroke-destructive" />
                </div>
              ) : (
                <div className="bg-muted/50 rounded-full p-0.5">
                  <Circle className="w-3 h-3 fill-muted-foreground/20 stroke-muted-foreground/40" />
                </div>
              )}
              {req.label}
            </li>
          );
        })}
      </ul>
    </div>
  );
};
