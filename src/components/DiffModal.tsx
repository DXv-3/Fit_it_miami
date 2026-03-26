import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Check, ArrowRight } from 'lucide-react';
import styled from 'styled-components';

const Overlay = styled(motion.div)`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(8px);
  z-index: 100;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
`;

const ModalContainer = styled(motion.div)`
  background: #121216;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 16px;
  width: 100%;
  max-width: 900px;
  max-height: 85vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-shadow: 0 24px 48px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.05);
`;

const Header = styled.div`
  padding: 16px 24px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: rgba(255, 255, 255, 0.02);
`;

const Title = styled.h2`
  font-family: 'Inter', sans-serif;
  font-size: 16px;
  font-weight: 600;
  color: #fff;
  margin: 0;
  display: flex;
  align-items: center;
  gap: 8px;
`;

const CloseButton = styled.button`
  background: transparent;
  border: none;
  color: rgba(255, 255, 255, 0.5);
  cursor: pointer;
  padding: 4px;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;

  &:hover {
    color: #fff;
    background: rgba(255, 255, 255, 0.1);
  }
`;

const DiffContainer = styled.div`
  display: flex;
  flex: 1;
  overflow: hidden;
  background: #0A0A0C;
`;

const CodePane = styled.div<{ $type: 'old' | 'new' }>`
  flex: 1;
  padding: 24px;
  overflow-y: auto;
  font-family: 'JetBrains Mono', monospace;
  font-size: 13px;
  line-height: 1.6;
  color: rgba(255, 255, 255, 0.8);
  background: ${props => props.$type === 'old' ? 'rgba(255, 50, 50, 0.03)' : 'rgba(50, 255, 50, 0.03)'};
  border-right: ${props => props.$type === 'old' ? '1px solid rgba(255, 255, 255, 0.05)' : 'none'};
`;

const Line = styled.div<{ $type?: 'add' | 'remove' }>`
  display: flex;
  padding: 0 8px;
  margin: 0 -8px;
  border-radius: 4px;
  background: ${props => {
    if (props.$type === 'add') return 'rgba(50, 255, 50, 0.1)';
    if (props.$type === 'remove') return 'rgba(255, 50, 50, 0.1)';
    return 'transparent';
  }};
  color: ${props => {
    if (props.$type === 'add') return '#4ade80';
    if (props.$type === 'remove') return '#f87171';
    return 'inherit';
  }};
`;

const LineNumber = styled.span`
  color: rgba(255, 255, 255, 0.3);
  width: 32px;
  flex-shrink: 0;
  text-align: right;
  margin-right: 16px;
  user-select: none;
`;

const Footer = styled.div`
  padding: 16px 24px;
  border-top: 1px solid rgba(255, 255, 255, 0.05);
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  background: rgba(255, 255, 255, 0.02);
`;

const Button = styled.button<{ $primary?: boolean }>`
  padding: 8px 16px;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  gap: 8px;

  ${props => props.$primary ? `
    background: #00E5FF;
    color: #0A0A0C;
    border: 1px solid #00E5FF;

    &:hover {
      background: #33EAFF;
      box-shadow: 0 0 15px rgba(0, 229, 255, 0.4);
    }
  ` : `
    background: transparent;
    color: rgba(255, 255, 255, 0.8);
    border: 1px solid rgba(255, 255, 255, 0.2);

    &:hover {
      background: rgba(255, 255, 255, 0.05);
      color: #fff;
    }
  `}
`;

interface DiffModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAccept: () => void;
}

export default function DiffModal({ isOpen, onClose, onAccept }: DiffModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <Overlay
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={onClose}
        >
          <ModalContainer
            initial={{ scale: 0.95, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 20 }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
            onClick={(e) => e.stopPropagation()}
          >
            <Header>
              <Title>
                <span className="text-cyan-400">AI Suggestion</span>
                <ArrowRight size={14} className="text-slate-500" />
                Refactor Selected Code
              </Title>
              <CloseButton onClick={onClose}>
                <X size={18} />
              </CloseButton>
            </Header>

            <DiffContainer>
              <CodePane $type="old">
                <div className="text-xs text-slate-500 mb-4 uppercase tracking-wider font-sans font-semibold">Original</div>
                <Line><LineNumber>1</LineNumber><span>function calculateTotal(items) {'{'}</span></Line>
                <Line $type="remove"><LineNumber>2</LineNumber><span>  let total = 0;</span></Line>
                <Line $type="remove"><LineNumber>3</LineNumber><span>  for (let i = 0; i &lt; items.length; i++) {'{'}</span></Line>
                <Line $type="remove"><LineNumber>4</LineNumber><span>    total += items[i].price * items[i].quantity;</span></Line>
                <Line $type="remove"><LineNumber>5</LineNumber><span>  {'}'}</span></Line>
                <Line $type="remove"><LineNumber>6</LineNumber><span>  return total;</span></Line>
                <Line><LineNumber>7</LineNumber><span>{'}'}</span></Line>
              </CodePane>
              
              <CodePane $type="new">
                <div className="text-xs text-cyan-500 mb-4 uppercase tracking-wider font-sans font-semibold">Suggested</div>
                <Line><LineNumber>1</LineNumber><span>function calculateTotal(items) {'{'}</span></Line>
                <Line $type="add"><LineNumber>2</LineNumber><span>  return items.reduce((total, item) =&gt; {'{'}</span></Line>
                <Line $type="add"><LineNumber>3</LineNumber><span>    return total + (item.price * item.quantity);</span></Line>
                <Line $type="add"><LineNumber>4</LineNumber><span>  {'}'}, 0);</span></Line>
                <Line><LineNumber>5</LineNumber><span>{'}'}</span></Line>
              </CodePane>
            </DiffContainer>

            <Footer>
              <Button onClick={onClose}>Reject</Button>
              <Button $primary onClick={onAccept}>
                <Check size={16} />
                Accept Changes
              </Button>
            </Footer>
          </ModalContainer>
        </Overlay>
      )}
    </AnimatePresence>
  );
}
