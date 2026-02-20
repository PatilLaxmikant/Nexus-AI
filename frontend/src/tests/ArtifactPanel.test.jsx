import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import ArtifactPanel from '../components/ArtifactPanel';

describe('ArtifactPanel', () => {
    const mockContent = 'console.log("Hello World");';
    const mockLanguage = 'javascript';

    it('renders correctly with content and language', () => {
        render(<ArtifactPanel content={mockContent} language={mockLanguage} onClose={() => { }} />);

        // Check header displays language
        expect(screen.getByText('javascript')).toBeInTheDocument();

        // Check content using testid
        const codeContainer = screen.getByTestId('code-content');
        expect(codeContainer).toBeInTheDocument();
        expect(codeContainer).toHaveTextContent('console.log');
    });

    it('renders correctly with markdown content', () => {
        const markdownContent = '# Heading';
        render(<ArtifactPanel content={markdownContent} language="markdown" onClose={() => { }} />);

        expect(screen.getByText('Heading')).toBeInTheDocument();
    });

    it('calls onClose when close button is clicked', () => {
        const onCloseMock = vi.fn();
        render(<ArtifactPanel content={mockContent} language={mockLanguage} onClose={onCloseMock} />);

        // Find close button by title attribute
        const closeButton = screen.getByTitle('Close panel');
        fireEvent.click(closeButton);

        expect(onCloseMock).toHaveBeenCalledTimes(1);
    });
});
