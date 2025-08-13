import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { X, Printer } from "lucide-react";
import { format } from "date-fns";
import type { HallPassWithStudent } from "@shared/schema";

interface PrintPassModalProps {
  pass: HallPassWithStudent;
  isOpen: boolean;
  onClose: () => void;
}

export default function PrintPassModal({ pass, isOpen, onClose }: PrintPassModalProps) {
  const handlePrint = () => {
    window.print();
    onClose();
  };

  const returnByTime = new Date(pass.timeOut);
  returnByTime.setMinutes(returnByTime.getMinutes() + pass.duration);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle>Hall Pass</DialogTitle>
            <Button variant="ghost" size="sm" onClick={onClose} data-testid="button-close-modal">
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>
        
        <div className="border-2 border-dashed border-gray-300 p-6 rounded-lg print:border-solid print:border-black print-section">
          <div className="text-center mb-4">
            <h2 className="text-xl font-bold text-gray-900">Lincoln High School</h2>
            <p className="text-sm text-gray-600">HALL PASS</p>
          </div>
          
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="font-medium">Student:</span>
              <span data-testid="text-print-student">{pass.student.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-medium">From:</span>
              <span data-testid="text-print-from">{pass.student.room}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-medium">To:</span>
              <span data-testid="text-print-to">{pass.destination}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-medium">Time Out:</span>
              <span data-testid="text-print-timeout">
                {format(new Date(pass.timeOut), "h:mm a")}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="font-medium">Return By:</span>
              <span data-testid="text-print-return">
                {format(returnByTime, "h:mm a")}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="font-medium">Teacher:</span>
              <span data-testid="text-print-teacher">{pass.issuingTeacher}</span>
            </div>
            {pass.notes && (
              <div className="flex justify-between">
                <span className="font-medium">Notes:</span>
                <span data-testid="text-print-notes" className="text-right max-w-32">
                  {pass.notes}
                </span>
              </div>
            )}
          </div>
          
          <div className="mt-6 pt-4 border-t border-gray-300">
            <p className="text-xs text-gray-500 text-center">
              Student must return within specified time
            </p>
          </div>
        </div>
        
        <div className="flex space-x-3 mt-6 print-hidden">
          <Button variant="outline" className="flex-1" onClick={onClose} data-testid="button-cancel-print">
            Cancel
          </Button>
          <Button className="flex-1" onClick={handlePrint} data-testid="button-print-pass">
            <Printer className="h-4 w-4 mr-2" />
            Print Pass
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
