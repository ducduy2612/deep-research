The Design Model: Frozen Checkpoints + Active Workspace                                                                         
                                                                                                                                 
 ```                                                                                                                             
   ┌─────────────────────────────────────────────────────────┐                                                                   
   │                                                         │                                                                   
   │  COMPLETED PHASES (frozen, read-only, persisted)        │                                                                   
   │  ┌──────────┐  ┌──────────┐  ┌──────────┐             │                                                                     
   │  │ Clarify  │→ │ Plan     │→ │ Research │             │                                                                     
   │  │ ✅ frozen│  │ ✅ frozen│  │ ✅ frozen│             │                                                                     
   │  └──────────┘  └──────────┘  └──────────┘             │                                                                     
   │       ↓              ↓              ↓                   │                                                                   
   │   questions       plan         learnings[]             │                                                                    
   │   + feedback                   + sources[]             │                                                                    
   │                                + images[]              │                                                                    
   │                                                         │                                                                   
   │  ─────────────────────────────────────────────────────  │                                                                   
   │                                                         │                                                                   
   │  ACTIVE PHASE (workspace, editable, user in control)    │                                                                   
   │  ┌──────────────────────────────────────┐              │                                                                    
   │  │  Report                              │              │                                                                    
   │  │  🔄 active — user can:              │              │                                                                     
   │  │  • Edit report text                  │              │                                                                    
   │  │  • Add writing requirements          │              │                                                                    
   │  │  • Rewrite                           │              │                                                                    
   │  │  • Export (MD/Word/PDF)              │              │                                                                    
   │  └──────────────────────────────────────┘              │                                                                    
   │                                                         │                                                                   
   └─────────────────────────────────────────────────────────┘                                                                   
 ```                                                                                                                             
                                                                                                                                 
 Now let me walk through every phase transition with this model:                                                                 
                                                                                                                                 
 ### Phase 1 → 2: Clarify → Plan                                                                                                 
                                                                                                                                 
 ```                                                                                                                             
   ACTIVE: Clarify                                                                                                               
     AI streams questions → user EDITS questions + writes feedback                                                               
     [Submit] → FREEZE (questions + feedback become checkpoint)                                                                  
                                                                                                                                 
   NEXT PHASE BECOMES ACTIVE: Plan                                                                                               
     Input: frozen(topic) + frozen(questions, feedback)                                                                          
     AI streams plan → user EDITS plan                                                                                           
     [Approve] → FREEZE (plan becomes checkpoint)                                                                                
 ```                                                                                                                             
                                                                                                                                 
 What's frozen: topic, questions, feedback, plan — all persisted, all survive refresh.                                           
                                                                                                                                 
 ### Phase 2 → 3: Plan → Research (the big workspace)                                                                            
                                                                                                                                 
 ```                                                                                                                             
   ACTIVE: Research                                                                                                              
     Input: frozen(plan)                                                                                                         
                                                                                                                                 
     Step A — SERP Queries generated:                                                                                            
       • Queries stream in as cards                                                                                              
       • User can DELETE queries they don't want                                                                                 
       • User can ADD manual queries                                                                                             
                                                                                                                                 
     Step B — Search + Analyze per query:                                                                                        
       • Learning streams into each card                                                                                         
       • User can EDIT learning text per card                                                                                    
       • User can RETRY a failed/bad query                                                                                       
       • User can DELETE a bad result entirely                                                                                   
       • User can EXPORT individual or all (MD/JSON)                                                                             
       • User can ADD result to knowledge base                                                                                   
                                                                                                                                 
     Step C — Review & Iterate:                                                                                                  
       • User sees all accumulated learnings                                                                                     
       • User writes SUGGESTION for direction                                                                                    
       • [More Research] → generates follow-up queries → back to Step A                                                          
       • Or [Finalize Findings] → FREEZE                                                                                         
                                                                                                                                 
     → FREEZE (learnings[], sources[], images[] become checkpoint)                                                               
 ```                                                                                                                             
                                                                                                                                 
 This is the phase that's currently broken in v1. It needs:                                                                      
 - Per-task CRUD (edit, retry, delete)                                                                                           
 - Suggestion input for review rounds                                                                                            
 - Manual query addition                                                                                                         
 - Export actions                                                                                                                
 - An explicit "I'm done researching" button that freezes                                                                        
                                                                                                                                 
 ### Phase 3 → 4: Research → Report                                                                                              
                                                                                                                                 
 ```                                                                                                                             
   ACTIVE: Report                                                                                                                
     Input: frozen(plan) + frozen(learnings[], sources[], images[])                                                              
                                                                                                                                 
     AI streams report → user EDITS report                                                                                       
     User can add writing requirements                                                                                           
     [Rewrite] → AI regenerates with same frozen inputs + new requirements                                                       
     [Export] → MD / Word / PDF                                                                                                  
     [Add to Knowledge Base]                                                                                                     
                                                                                                                                 
     [Done] → FREEZE → completed                                                                                                 
 ```                                                                                                                             
                                                                                                                                 
 ### What This Means Architecturally                                                                                             
                                                                                                                                 
 Store structure changes:                                                                                                        
                                                                                                                                 
 ```                                                                                                                             
   ResearchStore {                                                                                                               
     // Frozen checkpoints (immutable after phase completes)                                                                     
     checkpoints: {                                                                                                              
       clarify: { questions, feedback } | null,   // frozen after phase 1                                                        
       plan: { plan } | null,                      // frozen after phase 2                                                       
       research: { learnings, sources, images } | null, // frozen after phase 3                                                  
     }                                                                                                                           
                                                                                                                                 
     // Active phase (mutable workspace)                                                                                         
     activePhase: "clarify" | "plan" | "research" | "report"                                                                     
                                                                                                                                 
     // Workspace state for the ACTIVE phase only                                                                                
     workspace: {                                                                                                                
       // When clarify is active:                                                                                                
       questions: string,        // editable                                                                                     
       feedback: string,         // editable                                                                                     
                                                                                                                                 
       // When research is active:                                                                                               
       tasks: SearchResult[],    // editable, retryable, deletable                                                               
       suggestion: string,       // editable                                                                                     
                                                                                                                                 
       // When report is active:                                                                                                 
       report: string,           // editable                                                                                     
       requirements: string,     // editable                                                                                     
     }                                                                                                                           
                                                                                                                                 
     // Rehydration                                                                                                              
     // On refresh: restore checkpoints + activePhase                                                                            
     // If activePhase was mid-stream → convert to nearest awaiting_* state                                                      
     // workspace state is persisted too → user's edits survive refresh                                                          
   }                                                                                                                             
 ```                                                                                                                             
                                                                                                                                 
 The key invariant:                                                                                                              
 - Frozen data is never mutated — it's the immutable input to downstream phases                                                  
 - Workspace data is freely editable — it's the user's sandbox                                                                   
 - Phase transition = workspace → checkpoint (freeze) → new workspace opens                                                      
                                                                                                                                 
 What survives refresh:                                                                                                          
 - All frozen checkpoints (same as current v1)                                                                                   
 - The active phase's workspace state (new — v0 loses this)                                                                      
 - Which phase you're in (same as current v1)                                                                                    
                                                                                                                                 
 What the user gets that v0 didn't have:                                                                                         
 - Refresh doesn't lose their edits in the active phase                                                                          
 - Completed phases are visually distinct (frozen badge, read-only)                                                              
 - Clear sense of progress: "I've locked in clarify, I've locked in plan, I'm working on research now"                           
                                                                                                                                 
 ────────────────────────────────────────────────────────────────────────────────                                                
                                                                                                                                 
this will be next milestone focusing on:     
                                                                                                                                 
 1. Store refactor — checkpoints + workspace separation                                                                          
 2. Research workspace — per-task CRUD, suggestion input, review loop control                                                    
 3. Phase freeze UX — visual distinction between frozen and active, explicit "lock in" actions                                   
 4. Persistence — workspace state survives refresh (extending existing hydration)    